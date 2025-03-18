'use client'

import { Trade } from '@/types'
import { useEffect, useRef, useState } from 'react'

type KrakenTradeData = [string, string, string, 'b' | 's', string, string]

type MarketTrades = {
  trades: Trade[]
  hasInitialData: boolean
  hasReceivedFirstUpdate: boolean
}

type MarketConnection = {
  ws: WebSocket
  symbol: string
  hasInitialData: boolean
  hasReceivedFirstUpdate: boolean
  subscribed: boolean
  isReconnecting: boolean
}

type KrakenWebSocketMessage = {
  event?: string
  status?: string
  errorMessage?: string
  result?: Record<string, unknown>
  [key: string]: unknown
}

const KRAKEN_WS = 'wss://ws.kraken.com'
const INITIAL_BACKOFF = 1000
const MAX_BACKOFF = 30000
const BACKOFF_FACTOR = 2
const MAX_RETRIES = 5
const RATE_LIMIT_WINDOW = 500
const MAX_CONNECTIONS_PER_WINDOW = 5
const MAX_TRADES = 100

let lastConnectionAttempts: number[] = []

const canConnect = (): boolean => {
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

const formatSymbol = (symbol: string): string => {
  const symbolMap: Record<string, string> = {
    BTCUSDC: 'XBT/USD',
    ETHUSDC: 'ETH/USD',
    SOLUSDC: 'SOL/USD',
    LTCUSDC: 'LTC/USD',
    'XBT/USD': 'XBT/USD',
    'ETH/USD': 'ETH/USD',
    'SOL/USD': 'SOL/USD',
    'LTC/USD': 'LTC/USD',
  }
  return symbolMap[symbol] || symbol
}

const getBackoffDelay = (attempt: number): number => {
  const backoff = INITIAL_BACKOFF * Math.pow(BACKOFF_FACTOR, attempt)
  const jitter = backoff * 0.25 * (Math.random() * 2 - 1)
  return Math.min(backoff + jitter, MAX_BACKOFF)
}

export const useKrakenTrades = (
  symbol: string,
  initialTrades: Trade[] = [],
): {
  trades: Trade[]
  isConnected: boolean
  hasInitialData: boolean
} => {
  const [trades, setTrades] = useState<Trade[]>(initialTrades)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [hasInitialData, setHasInitialData] = useState<boolean>(
    initialTrades.length > 0,
  )
  const connectionsRef = useRef<Record<string, MarketConnection>>({})
  const activeSymbolRef = useRef<string>(symbol)
  const currentSymbolRef = useRef<string>(symbol)
  const marketCacheRef = useRef<Record<string, MarketTrades>>({})
  const reconnectAttemptsRef = useRef<Record<string, number>>({})

  useEffect(() => {
    if (initialTrades.length > 0) {
      marketCacheRef.current[symbol] = {
        trades: initialTrades,
        hasInitialData: true,
        hasReceivedFirstUpdate: false,
      }
      setTrades(initialTrades)
      setHasInitialData(true)
    }
  }, [symbol, initialTrades])

  const closeConnection = (marketSymbol: string) => {
    const connection = connectionsRef.current[marketSymbol]
    if (connection) {
      if (
        connection.ws.readyState === WebSocket.OPEN ||
        connection.ws.readyState === WebSocket.CONNECTING
      ) {
        connection.ws.close(1000, 'Cleanup')
      }
      delete connectionsRef.current[marketSymbol]
      delete reconnectAttemptsRef.current[marketSymbol]
    }
  }

  const createWebSocket = (marketSymbol: string) => {
    if (typeof window === 'undefined') return

    const existingConnection = connectionsRef.current[marketSymbol]
    if (existingConnection?.isReconnecting) {
      return
    }

    if (existingConnection?.ws.readyState === WebSocket.OPEN) {
      return
    }

    if (!canConnect()) {
      setTimeout(() => createWebSocket(marketSymbol), RATE_LIMIT_WINDOW)
      return
    }

    try {
      const ws = new WebSocket(KRAKEN_WS)
      const krakenSymbol = formatSymbol(marketSymbol)

      const connection: MarketConnection = {
        ws,
        symbol: marketSymbol,
        hasInitialData: false,
        hasReceivedFirstUpdate: false,
        subscribed: false,
        isReconnecting: false,
      }

      ws.onopen = () => {
        try {
          ws.send(JSON.stringify({ event: 'ping' }))
        } catch {
          ws.close()
          return
        }

        if (!connection.subscribed) {
          ws.send(
            JSON.stringify({
              event: 'subscribe',
              pair: [krakenSymbol],
              subscription: { name: 'trade' },
            }),
          )
        }

        connectionsRef.current[marketSymbol] = connection

        if (marketSymbol === currentSymbolRef.current) {
          setIsConnected(true)
        }
      }

      ws.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data) as KrakenWebSocketMessage

          if (
            parsedData.event === 'pong' ||
            parsedData.event === 'systemStatus'
          ) {
            return
          }

          if (parsedData.event === 'subscriptionStatus') {
            if (parsedData.status === 'subscribed') {
              connection.subscribed = true
            } else if (parsedData.status === 'error') {
              connection.subscribed = false
              ws.close()
            }
            return
          }

          if (
            Array.isArray(parsedData) &&
            parsedData.length >= 2 &&
            Array.isArray(parsedData[1])
          ) {
            const tradeData = parsedData[1] as KrakenTradeData[]

            const newTrades: Trade[] = tradeData.map((trade) => ({
              price: parseFloat(trade[0]),
              volume: parseFloat(trade[1]),
              time: parseFloat(trade[2]),
              side: trade[3] === 'b' ? 'buy' : 'sell',
            }))

            const existingTrades =
              marketCacheRef.current[marketSymbol]?.trades || []
            const combinedTrades = [...newTrades, ...existingTrades].slice(
              0,
              MAX_TRADES,
            )

            marketCacheRef.current[marketSymbol] = {
              trades: combinedTrades,
              hasInitialData: true,
              hasReceivedFirstUpdate: true,
            }

            if (marketSymbol === currentSymbolRef.current) {
              setTrades(combinedTrades)
              setHasInitialData(true)
            }
          }
        } catch (e) {
          console.log(e)
        }
      }

      ws.onerror = () => {
        if (!navigator.onLine) {
          window.addEventListener(
            'online',
            () => {
              reconnectAttemptsRef.current[marketSymbol] = 0
              connection.isReconnecting = false
              createWebSocket(marketSymbol)
            },
            { once: true },
          )
          return
        }

        const attempts = reconnectAttemptsRef.current[marketSymbol] || 0
        if (attempts < MAX_RETRIES) {
          reconnectAttemptsRef.current[marketSymbol] = attempts + 1
          connection.isReconnecting = true
          const delay = getBackoffDelay(attempts)
          setTimeout(() => {
            connection.isReconnecting = false
            createWebSocket(marketSymbol)
          }, delay)
        }
      }

      ws.onclose = (event) => {
        if (marketSymbol === currentSymbolRef.current) {
          setIsConnected(false)
        }

        if (event.code !== 1000 && !connection.isReconnecting) {
          const attempts = reconnectAttemptsRef.current[marketSymbol] || 0
          if (attempts < MAX_RETRIES) {
            reconnectAttemptsRef.current[marketSymbol] = attempts + 1
            connection.isReconnecting = true
            const delay = getBackoffDelay(attempts)
            setTimeout(() => {
              connection.isReconnecting = false
              createWebSocket(marketSymbol)
            }, delay)
          }
        }

        if (connectionsRef.current[marketSymbol] === connection) {
          delete connectionsRef.current[marketSymbol]
        }
      }
    } catch {
      const attempts = reconnectAttemptsRef.current[marketSymbol] || 0
      if (attempts < MAX_RETRIES) {
        reconnectAttemptsRef.current[marketSymbol] = attempts + 1
        const delay = getBackoffDelay(attempts)
        setTimeout(() => createWebSocket(marketSymbol), delay)
      }
    }
  }

  useEffect(() => {
    if (symbol !== activeSymbolRef.current) {
      activeSymbolRef.current = symbol
      currentSymbolRef.current = symbol

      const cachedData = marketCacheRef.current[symbol]
      if (cachedData) {
        setTrades(cachedData.trades)
        setHasInitialData(cachedData.hasInitialData)
      } else {
        setTrades([])
        setHasInitialData(false)
      }

      const connection = connectionsRef.current[symbol]
      setIsConnected(connection?.ws.readyState === WebSocket.OPEN)

      if (!connection) {
        createWebSocket(symbol)
      }
    }
  }, [symbol])

  useEffect(() => {
    const markets = ['XBT/USD', 'ETH/USD', 'SOL/USD', 'LTC/USD']

    markets.forEach((market) => {
      if (!connectionsRef.current[market]) {
        createWebSocket(market)
      }
    })

    return () => {
      Object.keys(connectionsRef.current).forEach((market) => {
        closeConnection(market)
      })
    }
  }, [])

  return { trades, isConnected, hasInitialData }
}
