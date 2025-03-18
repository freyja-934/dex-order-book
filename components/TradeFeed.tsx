'use client'

import { useMarket } from '@/context/MarketProvider'
import { useKrakenTrades } from '@/hooks/useKrakenTrades'
import { Trade } from '@/types'
import {
  Card,
  Group,
  Loader,
  ScrollArea,
  Skeleton,
  Table,
  Title,
} from '@mantine/core'
import { useEffect, useRef, useState } from 'react'

type MarketTrades = Record<string, Trade[]>

interface TradeFeedProps {
  initialTrades: MarketTrades
}

const TradeFeed = ({ initialTrades }: TradeFeedProps) => {
  const { activeMarket } = useMarket()
  const marketTrades = initialTrades[activeMarket] || []
  const { trades, isConnected } = useKrakenTrades(activeMarket, marketTrades)
  const [displayTrades, setDisplayTrades] = useState<Trade[]>(marketTrades)
  const currentMarketRef = useRef(activeMarket)

  useEffect(() => {
    if (currentMarketRef.current !== activeMarket) {
      setDisplayTrades(marketTrades)
      currentMarketRef.current = activeMarket
    } else if (trades.length > 0) {
      setDisplayTrades(trades)
    }
  }, [activeMarket, marketTrades, trades])

  const hasInitialTrades = marketTrades.length > 0

  if (!hasInitialTrades) {
    return (
      <Card h={550} shadow="sm" className="w-[400px] p-4" withBorder>
        <Title order={2} className="text-xl font-bold mb-4">
          Recent Trades - {activeMarket}
        </Title>
        <ScrollArea h={450}>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th className="text-center">Price</Table.Th>
                <Table.Th className="text-center">Size</Table.Th>
                <Table.Th className="text-center">Time</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {[...Array(15)].map((_, i) => (
                <Table.Tr key={`skeleton-trade-${i}`}>
                  <Table.Td className="text-center">
                    <Skeleton height={20} radius="sm" />
                  </Table.Td>
                  <Table.Td className="text-center">
                    <Skeleton height={20} radius="sm" />
                  </Table.Td>
                  <Table.Td className="text-center">
                    <Skeleton height={20} radius="sm" />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>
    )
  }

  return (
    <Card h={550} shadow="sm" className="w-[400px] p-4" withBorder>
      <Group>
        <Title order={2} size="lg" className="font-bold mb-4">
          Recent Trades - {activeMarket}
        </Title>
        {!isConnected && <Loader size="sm" color="gray" />}
      </Group>

      <ScrollArea h={450}>
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th className="text-center">Price</Table.Th>
              <Table.Th className="text-center">Size</Table.Th>
              <Table.Th className="text-center">Time</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {displayTrades.map((trade, i) => (
              <Table.Tr key={i}>
                <Table.Td
                  className={`text-center font-mono ${
                    trade.side === 'buy'
                      ? 'text-green-400 dark:text-green-500'
                      : 'text-red-400 dark:text-red-500'
                  }`}
                >
                  {Number(trade.price).toFixed(2)}
                </Table.Td>
                <Table.Td className="text-center font-mono">
                  {Number(trade.volume).toFixed(5)}
                </Table.Td>
                <Table.Td className="text-center font-mono">
                  {new Date(Number(trade.time) * 1000).toLocaleTimeString()}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Card>
  )
}

export default TradeFeed
