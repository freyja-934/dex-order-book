'use client'

import { useMarket } from '@/context/MarketProvider'
import { LoadingOverlay, SegmentedControl } from '@mantine/core'

const markets = ['XBT/USD', 'ETH/USD', 'SOL/USD', 'LTC/USD']

const MarketSelector = () => {
  const { activeMarket, setActiveMarket, isLoading } = useMarket()

  return (
    <div className="relative mt-4">
      <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
      <SegmentedControl
        data={markets}
        value={activeMarket}
        onChange={setActiveMarket}
        fullWidth
      />
    </div>
  )
}

export default MarketSelector
