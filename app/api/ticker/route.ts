import { NextResponse } from 'next/server'

function formatKrakenSymbol(pair: string): string {
  return pair.replace('/', '')
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const pair = searchParams.get('pair')

  if (!pair) {
    return NextResponse.json(
      { error: 'Pair parameter is required' },
      { status: 400 },
    )
  }

  try {
    const formattedPair = formatKrakenSymbol(pair)
    console.log('Requesting Kraken API for pair:', formattedPair)
    const response = await fetch(
      `https://api.kraken.com/0/public/Ticker?pair=${formattedPair}`,
    )
    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching from Kraken:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data from Kraken' },
      { status: 500 },
    )
  }
}
