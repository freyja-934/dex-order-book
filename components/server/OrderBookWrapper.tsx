import { OrderBookData } from '@/types'
import OrderBook from '../OrderBook'

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

export default async function OrderBookWrapper() {
  const initialData = await getInitialData()
  return <OrderBook initialData={initialData} />
} 