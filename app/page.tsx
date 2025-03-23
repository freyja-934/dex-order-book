import MarketSelector from '@/components/MarketSelector'
import OrderBookWrapper from '@/components/server/OrderBookWrapper'
import TradeFeedWrapper from '@/components/server/TradeFeedWrapper'
import { MarketProvider } from '@/context/MarketProvider'
import { Container, Group, Stack } from '@mantine/core'

export default async function Home() {
  return (
    <>
      <Container size="xl">
        <MarketProvider>
          <Stack align="center">
            <MarketSelector />
            <Group align="start">
              <OrderBookWrapper />
              <TradeFeedWrapper />
            </Group>
          </Stack>
        </MarketProvider>
      </Container>
    </>
  )
}
