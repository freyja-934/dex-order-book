import { Trade } from '@/types'
import TradeFeed from '../TradeFeed'

type MarketTrades = Record<string, Trade[]>

const formatSymbolForRest = (symbol: string) => {
  const symbolMap: Record<string, string> = {
    'XBT/USD': 'XBTUSD',
    'ETH/USD': 'ETHUSD',
    'SOL/USD': 'SOLUSD',
    'LTC/USD': 'LTCUSD',
  }
  return symbolMap[symbol] || symbol
}

async function getInitialTrades(): Promise<MarketTrades> {
  try {
    const markets = ['XBT/USD', 'ETH/USD', 'SOL/USD', 'LTC/USD']
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

    const tradesPromises = markets.map(async (market) => {
      const restSymbol = formatSymbolForRest(market)
      const response = await fetch(
        `${baseUrl}/api/trades?symbol=${restSymbol}`,
        {
          cache: 'no-store',
        },
      )
      const data = await response.json()
      return {
        market,
        trades: data.trades || [],
      }
    })

    const results = await Promise.all(tradesPromises)

    return results.reduce((acc, { market, trades }) => {
      acc[market] = trades
      return acc
    }, {} as MarketTrades)
  } catch {
    return {}
  }
}

export default async function TradeFeedWrapper() {
  const initialTrades = await getInitialTrades()
  return <TradeFeed initialTrades={initialTrades} />
} 