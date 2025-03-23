import MarketSelector from '@/components/MarketSelector'
import OrderBookWrapper from '@/components/server/OrderBookWrapper'
import TradeFeedWrapper from '@/components/server/TradeFeedWrapper'
import { Container, Group, Stack } from '@mantine/core'

export default async function Home() {
  return (
    <>
      <Container size="xl">
        <Stack align="center">
          <MarketSelector />
          <Group align="start">
            <OrderBookWrapper />
            <TradeFeedWrapper />
          </Group>
        </Stack>
      </Container>
    </>
  )
}
