'use client'

import { createContext, PropsWithChildren, useContext, useState } from 'react'

interface MarketContextType {
  activeMarket: string
  setActiveMarket: (market: string) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

const MarketContext = createContext<MarketContextType | undefined>(undefined)

export const MarketProvider = ({ children }: PropsWithChildren) => {
  const [activeMarket, setActiveMarket] = useState('XBT/USD')
  const [isLoading, setIsLoading] = useState(false)

  const handleMarketChange = (market: string) => {
    setActiveMarket(market)
  }

  return (
    <MarketContext.Provider
      value={{
        activeMarket,
        setActiveMarket: handleMarketChange,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </MarketContext.Provider>
  )
}

export const useMarket = () => {
  const context = useContext(MarketContext)
  if (!context) throw new Error('useMarket must be used within MarketProvider')
  return context
}
