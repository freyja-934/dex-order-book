const BASE_URL = 'https://api.binance.com/api/v3'

export const fetchOrderBook = async (symbol: string) => {
  const res = await fetch(`${BASE_URL}/depth?symbol=${symbol}&limit=10`)
  return res.json()
}

export const fetchRecentTrades = async (symbol: string) => {
  const res = await fetch(`${BASE_URL}/trades?symbol=${symbol}&limit=10`)
  return res.json()
}

export const fetchSymbolPrice = async (symbol: string) => {
  const res = await fetch(`${BASE_URL}/ticker/price?symbol=${symbol}`)
  return res.json()
}
