import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = (searchParams.get('symbol') || 'XBT/USD').replace('/', '')
  const count = searchParams.get('count') || '10'

  try {
    const response = await fetch(
      `https://api.kraken.com/0/public/Depth?pair=${symbol}&count=${count}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (!data || !data.result || Object.keys(data.result).length === 0) {
      throw new Error('Invalid response format from Kraken API')
    }

    const pair = Object.keys(data.result)[0]
    const result = data.result[pair]

    if (!result || !result.asks || !result.bids) {
      throw new Error('Missing required fields in Kraken API response')
    }

    const transformedData = {
      asks: result.asks,
      bids: result.bids,
      timestamp: Date.now(),
    }

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error('Error fetching orderbook:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to fetch orderbook',
      },
      { status: 500 },
    )
  }
}
