export interface OrderBookData {
  asks: [string, string][]
  bids: [string, string][]
  timestamp: number
}

export interface OrderBookEntry {
  asks: Record<string, string>
  bids: Record<string, string>
  timestamp: number
}

export interface Trade {
  price: number
  volume: number
  time: number
  side: 'buy' | 'sell'
}
