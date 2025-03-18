'use client'

import { useMarket } from '@/context/MarketProvider'
import { Title } from '@mantine/core'
import { useEffect, useState } from 'react'

type PriceData = {
  lastPrice: string
  volume24h: string
  high24h: string
  low24h: string
}

function formatSymbol(symbol: string) {
  const symbolMap: Record<string, string> = {
    BTCUSDC: 'XBT/USD',
    ETHUSDC: 'ETH/USD',
    SOLUSDC: 'SOL/USD',
    LTCUSDC: 'LTC/USD',
  }

  return symbolMap[symbol] || symbol
}

async function fetchKrakenPrice(symbol: string): Promise<PriceData> {
  const formattedSymbol = formatSymbol(symbol)
  const response = await fetch(`/api/ticker?pair=${formattedSymbol}`)
  const data = await response.json()

  if (data.error && data.error.length > 0) {
    throw new Error(data.error[0])
  }

  const pair = Object.keys(data.result)[0]
  const ticker = data.result[pair]
  return {
    lastPrice: parseFloat(ticker.c[0]).toFixed(2),
    volume24h: parseFloat(ticker.v[1]).toFixed(2),
    high24h: parseFloat(ticker.h[1]).toFixed(2),
    low24h: parseFloat(ticker.l[1]).toFixed(2),
  }
}

interface PriceHeaderProps {
  initialData: PriceData
}

export default function PriceHeader({ initialData }: PriceHeaderProps) {
  const { activeMarket } = useMarket()
  const [priceData, setPriceData] = useState<PriceData>(initialData)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const fetchData = async () => {
      try {
        const data = await fetchKrakenPrice(activeMarket)
        if (mounted) {
          setPriceData(data)
          setError(null)
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to fetch price data',
          )
        }
      }
    }

    if (activeMarket) {
      fetchData()
      const interval = setInterval(fetchData, 10000)
      return () => {
        mounted = false
        clearInterval(interval)
      }
    }
  }, [activeMarket])

  if (error) {
    return (
      <div className="h-20 flex items-center px-4">
        <div className="text-red-400">Error loading price data: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-[5rem] flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2 sm:py-0 bg-gray-900">
      <Title
        order={1}
        className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-0"
      >
        {activeMarket} - ${priceData.lastPrice}
      </Title>
      <div className="flex flex-wrap gap-4 sm:gap-6 text-sm sm:text-base">
        <div className="text-white">
          <span className="text-gray-400">24h Vol:</span> ${priceData.volume24h}
        </div>
        <div className="text-white">
          <span className="text-gray-400">24h High:</span> ${priceData.high24h}
        </div>
        <div className="text-white">
          <span className="text-gray-400">24h Low:</span> ${priceData.low24h}
        </div>
      </div>
    </div>
  )
}
