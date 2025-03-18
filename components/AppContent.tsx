'use client'

import { MarketProvider } from '@/context/MarketProvider'
import { AppShell } from '@mantine/core'
import { PropsWithChildren } from 'react'
import PriceHeader from './PriceHeader'

type PriceData = {
  lastPrice: string
  volume24h: string
  high24h: string
  low24h: string
}

interface AppContentProps extends PropsWithChildren {
  initialPriceData: PriceData
}

export default function AppContent({
  children,
  initialPriceData,
}: AppContentProps) {
  return (
    <MarketProvider>
      <AppShell header={{ height: 80 }} padding="md">
        <AppShell.Header>
          <PriceHeader initialData={initialPriceData} />
        </AppShell.Header>
        <AppShell.Main>{children}</AppShell.Main>
      </AppShell>
    </MarketProvider>
  )
}
