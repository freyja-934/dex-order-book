import AppContent from '@/components/AppContent'
import { ColorSchemeScript, MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import { PropsWithChildren } from 'react'
import './globals.css'

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

export default async function RootLayout({ children }: PropsWithChildren) {
  const initialPriceData = await getInitialPriceData()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
        <title>Mini Exchange</title>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width"
        />
      </head>
      <body>
        <MantineProvider
          defaultColorScheme="dark"
          theme={{
            primaryColor: 'blue',
            white: '#fff',
            black: '#1A1B1E',
          }}
        >
          <AppContent initialPriceData={initialPriceData}>
            {children}
          </AppContent>
        </MantineProvider>
      </body>
    </html>
  )
}
