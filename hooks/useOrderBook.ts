'use client'

import { OrderBookData } from '@/types'
import { throttle } from 'lodash'
import { useEffect, useRef, useState } from 'react'

const KRAKEN_WS = 'wss://ws.kraken.com'
const INITIAL_BACKOFF = 1000
const MAX_BACKOFF = 30000
const BACKOFF_FACTOR = 2
const MAX_RETRIES = 5
const DEPTH = 10
const RATE_LIMIT_WINDOW = 1000
const MAX_CONNECTIONS_PER_WINDOW = 3
const CONNECTION_TIMEOUT = 5000
const THROTTLE_MS = 100

let lastConnectionAttempts: number[] = []

const canConnect = () => {
  const now = Date.now()
  lastConnectionAttempts = lastConnectionAttempts.filter(
    (time) => now - time < RATE_LIMIT_WINDOW,
  )
  if (lastConnectionAttempts.length < MAX_CONNECTIONS_PER_WINDOW) {
    lastConnectionAttempts.push(now)
    return true
  }
  return false
}

const formatSymbol = (symbol: string) => {
  const symbolMap: Record<string, string> = {
    BTCUSDC: 'XBT/USD',
    ETHUSDC: 'ETH/USD',
    SOLUSDC: 'SOL/USD',
    LTCUSDC: 'LTC/USD',
  }
  return symbolMap[symbol] || symbol
}

const getBackoffDelay = (attempt: number): number => {
  const backoff = INITIAL_BACKOFF * Math.pow(BACKOFF_FACTOR, attempt)
  const jitter = backoff * 0.25 * (Math.random() * 2 - 1)
  return Math.min(backoff + jitter, MAX_BACKOFF)
}

// TODO: use one or the other for initial data as its passed in as a prop
const fetchInitialOrderBook = async (
  symbol: string,
): Promise<OrderBookData | null> => {
  try {
    const response = await fetch(
      `/api/orderbook?symbol=${symbol}&count=${DEPTH}`,
    )
    const data = await response.json()
    if (!data.asks || !data.bids) return null
    return {
      asks: data.asks,
      bids: data.bids,
      timestamp: Date.now(),
    }
  } catch (error) {
    console.error('Error fetching initial orderbook:', error)
    return null
  }
}

export function useOrderBook(
  symbol: string,
  initialData: OrderBookData | null,
) {
  const [data, setData] = useState<OrderBookData | null>(initialData)
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isCleaningUpRef = useRef(false)

  const throttledSetDataRef = useRef(
    throttle(
      (updater: (prev: OrderBookData | null) => OrderBookData | null) => {
        setData((prev) => {
          const newData = updater(prev)
          if (newData && (newData.asks.length > 0 || newData.bids.length > 0)) {
            return newData
          }
          return prev
        })
      },
      THROTTLE_MS,
      { leading: true, trailing: true },
    ),
  )

  const throttledSetData = throttledSetDataRef.current!

  useEffect(() => {
    const getInitialData = async () => {
      const formattedSymbol = formatSymbol(symbol)
      const initialData = await fetchInitialOrderBook(formattedSymbol)
      if (initialData) setData(initialData)
    }
    getInitialData()
  }, [symbol])

  const createWebSocket = () => {
    if (typeof window === 'undefined' || isCleaningUpRef.current) return
    if (!canConnect()) {
      setTimeout(() => createWebSocket(), RATE_LIMIT_WINDOW)
      return
    }

    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close()
      }

      const ws = new WebSocket(KRAKEN_WS)
      wsRef.current = ws

      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) ws.close()
      }, CONNECTION_TIMEOUT)

      ws.onopen = () => {
        if (isCleaningUpRef.current) {
          ws.close(1000)
          return
        }

        clearTimeout(connectionTimeout)
        setIsConnected(true)
        reconnectAttemptRef.current = 0

        ws.send(JSON.stringify({ event: 'ping' }))
        if (!document.hidden) {
          ws.send(
            JSON.stringify({
              event: 'subscribe',
              pair: [formatSymbol(symbol)],
              subscription: { name: 'book', depth: DEPTH },
            }),
          )
        }
      }

      ws.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data)

          if (
            parsedData.event === 'pong' ||
            parsedData.event === 'systemStatus'
          ) {
            return
          }

          if (parsedData.event === 'subscriptionStatus') {
            if (parsedData.status === 'error') ws.close()
            return
          }

          if (!Array.isArray(parsedData) || parsedData.length < 2) return

          const orderBookUpdate = parsedData[1]
          if (orderBookUpdate.as && orderBookUpdate.bs) {
            throttledSetData(() => ({
              asks: orderBookUpdate.as,
              bids: orderBookUpdate.bs,
              timestamp: Date.now(),
            }))
            return
          }

          throttledSetData((prev) => {
            if (!prev) return prev

            const updatedAsks = [...prev.asks]
            const updatedBids = [...prev.bids]

            if (orderBookUpdate.a) {
              orderBookUpdate.a.forEach(([price, volume]: [string, string]) => {
                const index = updatedAsks.findIndex(([p]) => p === price)
                if (parseFloat(volume) === 0) {
                  if (index !== -1) updatedAsks.splice(index, 1)
                } else {
                  if (index !== -1) {
                    updatedAsks[index] = [price, volume]
                  } else {
                    updatedAsks.push([price, volume])
                  }
                }
              })
            }

            if (orderBookUpdate.b) {
              orderBookUpdate.b.forEach(([price, volume]: [string, string]) => {
                const index = updatedBids.findIndex(([p]) => p === price)
                if (parseFloat(volume) === 0) {
                  if (index !== -1) updatedBids.splice(index, 1)
                } else {
                  if (index !== -1) {
                    updatedBids[index] = [price, volume]
                  } else {
                    updatedBids.push([price, volume])
                  }
                }
              })
            }

            updatedAsks.sort(([a], [b]) => parseFloat(a) - parseFloat(b))
            updatedBids.sort(([a], [b]) => parseFloat(b) - parseFloat(a))

            return {
              asks: updatedAsks.slice(0, DEPTH),
              bids: updatedBids.slice(0, DEPTH),
              timestamp: Date.now(),
            }
          })
        } catch (error) {
          console.error('Error processing message:', error)
        }
      }

      ws.onerror = () => {
        clearTimeout(connectionTimeout)
        setIsConnected(false)

        if (!navigator.onLine) {
          window.addEventListener('online', () => createWebSocket(), {
            once: true,
          })
          return
        }

        if (reconnectAttemptRef.current < MAX_RETRIES) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptRef.current += 1
            createWebSocket()
          }, getBackoffDelay(reconnectAttemptRef.current))
        }
      }

      ws.onclose = () => {
        clearTimeout(connectionTimeout)
        setIsConnected(false)

        if (
          !isCleaningUpRef.current &&
          reconnectAttemptRef.current < MAX_RETRIES
        ) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptRef.current += 1
            createWebSocket()
          }, getBackoffDelay(reconnectAttemptRef.current))
        }
      }
    } catch (error) {
      console.error('Error creating WebSocket:', error)
      if (reconnectAttemptRef.current < MAX_RETRIES) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptRef.current += 1
          createWebSocket()
        }, getBackoffDelay(reconnectAttemptRef.current))
      }
    }
  }

  useEffect(() => {
    const handleVisibilityChange = () => {
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) return

      if (document.hidden) {
        ws.send(
          JSON.stringify({
            event: 'unsubscribe',
            pair: [formatSymbol(symbol)],
            subscription: { name: 'book' },
          }),
        )
      } else {
        ws.send(
          JSON.stringify({
            event: 'subscribe',
            pair: [formatSymbol(symbol)],
            subscription: { name: 'book', depth: DEPTH },
          }),
        )
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    reconnectAttemptRef.current = 0
    createWebSocket()

    return () => {
      isCleaningUpRef.current = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

      const ws = wsRef.current
      if (ws?.readyState === WebSocket.OPEN) {
        ws.close(1000)
      }

      if (throttledSetDataRef.current) {
        throttledSetDataRef.current.cancel()
      }
    }
  }, [symbol])

  return { data, isConnected }
}
