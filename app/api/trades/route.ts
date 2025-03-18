import { NextResponse } from 'next/server'

const KRAKEN_API = 'https://api.kraken.com/0/public'

const formatSymbol = (symbol: string) => {
  return symbol
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const count = searchParams.get('count') || '50'

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 },
      )
    }

    const formattedSymbol = formatSymbol(symbol)
    const response = await fetch(
      `${KRAKEN_API}/Trades?pair=${formattedSymbol}&count=${count}`,
    )

    if (!response.ok) {
      throw new Error(`Kraken API error: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.error && data.error.length > 0) {
      return NextResponse.json({ error: data.error[0] }, { status: 400 })
    }

    const pairKey = Object.keys(data.result)[0]
    const trades = data.result[pairKey]

    const formattedTrades = trades.map(
      (trade: [string, string, string, 'b' | 's', string, string]) => ({
        price: trade[0],
        volume: trade[1],
        time: trade[2],
        side: trade[3] === 'b' ? 'buy' : 'sell',
      }),
    )

    return NextResponse.json({ trades: formattedTrades })
  } catch (error) {
    console.error('Error fetching trades:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 },
    )
  }
}
