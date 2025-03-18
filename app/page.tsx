import MarketSelector from '@/components/MarketSelector'
import OrderBook from '@/components/OrderBook'
import TradeFeed from '@/components/TradeFeed'
import { OrderBookData, Trade } from '@/types'
import { Container, Group, Stack } from '@mantine/core'

type PriceData = {
  lastPrice: string
  volume24h: string
  high24h: string
  low24h: string
}

async function getInitialPriceData(): Promise<PriceData> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/ticker?pair=XBT/USD`, {
      cache: 'no-store',
    })
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
  } catch (error) {
    throw error
  }
}

async function getInitialData(): Promise<OrderBookData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/orderbook?symbol=XBTUSD`)
    const data = await response.json()
    return data
  } catch {
    return null
  }
}

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

export default async function Home() {
  const initialData = await getInitialData()
  const initialTrades = await getInitialTrades()

  return (
    <>
      <Container size="xl">
        <Stack align="center">
          <MarketSelector />
          <Group align="start">
            <OrderBook initialData={initialData} />
            <TradeFeed initialTrades={initialTrades} />
          </Group>
        </Stack>
      </Container>
    </>
  )
}

export async function generateMetadata() {
  const initialPriceData = await getInitialPriceData()
  return {
    initialPriceData,
  }
}
