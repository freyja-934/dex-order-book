'use client'

import { useMarket } from '@/context/MarketProvider'
import { useOrderBook } from '@/hooks/useOrderBook'
import { OrderBookData } from '@/types'
import { Card, ScrollArea, Skeleton, Stack, Table, Title } from '@mantine/core'
import { memo, useMemo } from 'react'

interface OrderBookProps {
  initialData: OrderBookData | null
}

const OrderBookRow = memo(function OrderBookRow({
  price,
  amount,
  type,
}: {
  price: string
  amount: string
  type: 'ask' | 'bid'
}) {
  const total = useMemo(
    () => (Number(price) * Number(amount)).toFixed(2),
    [price, amount],
  )

  return (
    <Table.Tr>
      <Table.Td
        className={`text-right font-mono text-xs ${
          type === 'ask'
            ? 'text-red-400 dark:text-red-500'
            : 'text-green-400 dark:text-green-500'
        }`}
      >
        {Number(price).toFixed(2)}
      </Table.Td>
      <Table.Td className="text-right font-mono text-xs">
        {Number(amount).toFixed(5)}
      </Table.Td>
      <Table.Td className="text-right font-mono text-xs">{total}</Table.Td>
    </Table.Tr>
  )
})

const OrderBookTable = memo(function OrderBookTable({
  data,
  type,
}: {
  data: [string, string][]
  type: 'ask' | 'bid'
}) {
  return (
    <Table
      styles={{ td: { width: '150px' } }}
      striped
      highlightOnHover
      withTableBorder
      withColumnBorders
    >
      <Table.Thead>
        <Table.Tr>
          <Table.Th className="text-center text-xs">Price</Table.Th>
          <Table.Th className="text-center text-xs">Size</Table.Th>
          <Table.Th className="text-center text-xs">Total</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {data.map(([price, amount]) => (
          <OrderBookRow
            key={`${type}-${price}`}
            price={price}
            amount={amount}
            type={type}
          />
        ))}
      </Table.Tbody>
    </Table>
  )
})

const LoadingTable = () => (
  <Table striped highlightOnHover withTableBorder withColumnBorders>
    <Table.Thead>
      <Table.Tr>
        <Table.Th className="text-center text-xs">Price</Table.Th>
        <Table.Th className="text-center text-xs">Size</Table.Th>
        <Table.Th className="text-center text-xs">Total</Table.Th>
      </Table.Tr>
    </Table.Thead>
    <Table.Tbody>
      {[...Array(5)].map((_, i) => (
        <Table.Tr key={`skeleton-${i}`}>
          <Table.Td className="text-center text-xs">
            <Skeleton height={20} radius="sm" />
          </Table.Td>
          <Table.Td className="text-center text-xs">
            <Skeleton height={20} radius="sm" />
          </Table.Td>
          <Table.Td className="text-center text-xs">
            <Skeleton height={20} radius="sm" />
          </Table.Td>
        </Table.Tr>
      ))}
    </Table.Tbody>
  </Table>
)

export default function OrderBook({ initialData }: OrderBookProps) {
  const { activeMarket } = useMarket()
  const { data } = useOrderBook(activeMarket, initialData)

  const title = useMemo(
    () => (
      <Title order={2} size="lg" className="font-bold mb-4">
        Order Book - {activeMarket}
      </Title>
    ),
    [activeMarket],
  )

  if (!data) {
    return (
      <Card h={800} shadow="sm" className="w-[500px] p-4" withBorder>
        {title}
        <Stack gap="md">
          <div>
            <Title order={3} size="md" className="font-semibold mb-2">
              Sells
            </Title>
            <LoadingTable />
          </div>
          <div>
            <Title order={3} size="md" className="font-semibold mb-2">
              Buys
            </Title>
            <LoadingTable />
          </div>
        </Stack>
      </Card>
    )
  }

  return (
    <Card h={800} shadow="sm" className="w-[500px] p-4" withBorder>
      {title}
      <Stack gap="md">
        <div>
          <Title
            order={3}
            size="md"
            className="font-semibold mb-2 text-red-400 dark:text-red-500"
          >
            Sells
          </Title>
          <ScrollArea h={350}>
            <OrderBookTable data={data.asks} type="ask" />
          </ScrollArea>
        </div>
        <div>
          <Title
            order={3}
            size="md"
            className="font-semibold mb-2 text-green-400 dark:text-green-500"
          >
            Buys
          </Title>
          <ScrollArea h={350}>
            <OrderBookTable data={data.bids} type="bid" />
          </ScrollArea>
        </div>
      </Stack>
    </Card>
  )
}
