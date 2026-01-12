import { useEffect, useState } from 'react';
import { Container, Title, Paper, Text, Skeleton, SegmentedControl, Group, SimpleGrid, List, ThemeIcon, Button, Table, Stack, useMantineColorScheme } from '@mantine/core';
import { BarChart, AreaChart } from '@mantine/charts';
import { useAuth } from '../context/AuthContext';
import { Cell } from 'recharts';
import { Link } from 'react-router-dom';
import { DatePickerInput, type DatesRangeValue } from '@mantine/dates';
import { startOfMonth, endOfMonth, subMonths, subDays, format, differenceInDays } from 'date-fns';
import { IconAlertTriangle, IconClockHour4, IconArrowUpRight, IconReceipt } from '@tabler/icons-react';
import type { Stats } from '../types';
import type { ReactNode } from 'react';
import api from '../api/axios';
import { PlanUsageWidget } from '../components/PlanUsageWidget';

const adjustDateForTimezone = (date: Date | string | null): Date | null => {
  if (!date) return null;
  const newDate = new Date(date);
  newDate.setMinutes(newDate.getMinutes() + newDate.getTimezoneOffset());
  return newDate;
};

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const StatCard = ({ title, value, formatAsCurrency = false, icon: Icon, color }: { title: string, value: number, formatAsCurrency?: boolean, icon?: any, color?: string }) => {
  const formattedValue = formatAsCurrency 
  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  : value;
  
  return (
    <Paper withBorder p="md" radius="md" shadow="sm">
      <Group justify="space-between">
        <Text size="xs" c="dimmed" fw={700} tt="uppercase">{title}</Text>
        {Icon && <ThemeIcon color={color || 'blue'} variant="light" radius="xl"><Icon size={16} /></ThemeIcon>}
      </Group>
      <Text fw={700} size="xl" mt="xs" c="var(--mantine-color-text)">{formattedValue}</Text>
    </Paper>
  );
};

const ChartTooltip = ({ label, payload }: { label: ReactNode; payload: readonly { name: string; value: number; color: string; }[] | undefined }) => {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  if (!payload || !payload.length) return null;
  return (
    <Paper px="md" py="sm" withBorder shadow="md" radius="md" bg={isDark ? 'dark.7' : 'white'}>
      <Text fw={700} mb={5}>{label}</Text>
      {payload.map((item) => (
        <Text key={item.name} c={item.color} size="sm">
          {item.name === 'count' ? 'Orçamentos' : item.name}: {item.value}
        </Text>
      ))}
    </Paper>
  );
};

function DashboardPage() {
  const { can } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('this_month');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([startOfMonth(new Date()), endOfMonth(new Date())]);
  
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const chartTextColor = isDark ? '#e9ecef' : '#495057';

  useEffect(() => {
    const [startDate, endDate] = dateRange;
    if (startDate && endDate) {
      setLoading(true);
      const params = {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      };
      api.get('/dashboard/stats', { params })
      .then(response => { setStats(response.data); })
      .finally(() => setLoading(false));
    }
  }, [dateRange]);

  useEffect(() => {
    const today = new Date();
    if (period === 'today') setDateRange([today, today]);
    if (period === 'last_7_days') setDateRange([subDays(today, 6), today]);
    if (period === 'this_month') setDateRange([startOfMonth(today), endOfMonth(today)]);
    if (period === 'last_month') {
      const lastMonth = subMonths(today, 1);
      setDateRange([startOfMonth(lastMonth), endOfMonth(lastMonth)]);
    }
  }, [period]);
  
  if (loading || !stats) {
    return (
    <Container size="xl" py="xl">
      <Skeleton height={40} mb="md" />
      <SimpleGrid cols={3} mb="md"><Skeleton height={100} /><Skeleton height={100} /><Skeleton height={100} /></SimpleGrid>
      <SimpleGrid cols={2} mb="md"><Skeleton height={300} /><Skeleton height={300} /></SimpleGrid>
    </Container>
    );
  }

  const { kpis, lowStockProducts, staleQuotes, topSellingProducts, salespersonRanking } = stats;
  
  const quoteStatusData = stats.quoteStats?.statuses.map(status => ({
    status: status.name,
    Orçamentos: stats.quoteStats?.counts[status.name] || 0,
    color: `var(--mantine-color-${status.color}-6)`,
  })).filter(item => item.Orçamentos > 0) ?? [];
  
  const orderStatusData = stats.orderStats?.statuses.map(status => ({
    status: status.name,
    Pedidos: stats.orderStats?.counts[status.name] || 0,
    color: `var(--mantine-color-${status.color}-6)`,
  })).filter(item => item.Pedidos > 0) ?? [];

  const topProductsRows = topSellingProducts.map((product) => (
    <Table.Tr key={product.product_name}>
      <Table.Td>{product.product_name}</Table.Td>
      <Table.Td align="right">{product.total_quantity}</Table.Td>
    </Table.Tr>
  ));

  const topSalespeopleRows = salespersonRanking.map((salesperson) => (
    <Table.Tr key={salesperson.salesperson_name}>
      <Table.Td>{salesperson.salesperson_name}</Table.Td>
      <Table.Td align="right">{salesperson.total_sales}</Table.Td>
      <Table.Td align="right">{formatCurrency(salesperson.total_value)}</Table.Td>
    </Table.Tr>
  ));

  return (
  <Container size="xl" py="xl">
    <Group justify="space-between" mb="lg">
      <Title order={2}>Visão Geral</Title>
      <SegmentedControl value={period} onChange={setPeriod} data={[ { label: 'Hoje', value: 'today' }, { label: '7 Dias', value: 'last_7_days' }, { label: 'Este Mês', value: 'this_month' }, { label: 'Mês Passado', value: 'last_month' }, { label: 'Custom', value: 'custom' } ]} />
    </Group>

    {period === 'custom' && (<DatePickerInput type="range" label="Selecione o período" placeholder="De - Até" value={dateRange} valueFormat="DD/MM/YYYY" onChange={(value: DatesRangeValue) => { const [start, end] = value; setDateRange([adjustDateForTimezone(start), adjustDateForTimezone(end)]); }} mb="xl" />)}

    <Stack gap="lg">
      {can('quotes.view') && (
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <StatCard title="Faturamento (Aprovados)" value={kpis.approvedValue} formatAsCurrency icon={IconArrowUpRight} color="green" />
          <StatCard title="Previsão (Em Negociação)" value={kpis.forecastValue} formatAsCurrency icon={IconClockHour4} color="yellow" />
          <StatCard title="Ticket Médio" value={kpis.averageTicket} formatAsCurrency icon={IconReceipt} color="blue" />
        </SimpleGrid>
      )}

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        {can('quotes.view') && (
            <Paper withBorder p="md" radius="md" shadow="sm">
              <Title order={5} mb="md">Funil de Orçamentos</Title>
              <BarChart h={300} data={quoteStatusData} dataKey="status" series={[{ name: 'Orçamentos' }]} xAxisProps={{ tick: { fill: chartTextColor, fontSize: 12 } }} yAxisProps={{ tick: { fill: chartTextColor, fontSize: 12 } }} tooltipProps={{ content: ({ label, payload }) => <ChartTooltip label={label} payload={payload} />, cursor: { fill: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' } }} barProps={{ radius: [4, 4, 0, 0], barSize: 40 }} >
                {quoteStatusData.map((item) => (<Cell key={item.status} fill={item.color} />))}
              </BarChart>
            </Paper>
        )}
        
        {(can('production_orders.view') || can('production_orders.view_all')) && (
            <Paper withBorder p="md" radius="md" shadow="sm">
              <Title order={5} mb="md">Status da Produção</Title>
              <BarChart h={300} data={orderStatusData} dataKey="status" series={[{ name: 'Pedidos' }]} xAxisProps={{ tick: { fill: chartTextColor, fontSize: 12 } }} yAxisProps={{ tick: { fill: chartTextColor, fontSize: 12 } }} tooltipProps={{ content: ({ label, payload }) => <ChartTooltip label={label} payload={payload} />, cursor: { fill: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' } }} barProps={{ radius: [4, 4, 0, 0], barSize: 40 }} >
                {orderStatusData.map((item) => (<Cell key={item.status} fill={item.color} />))}
              </BarChart>
            </Paper>
        )}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        {can('quotes.view_all') && topSellingProducts.length > 0 && (
            <Paper withBorder p="md" radius="md" shadow="sm">
              <Title order={5} mb="md">Top Produtos</Title>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Produto</Table.Th>
                    <Table.Th style={{textAlign: 'right'}}>Qtd.</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>{topProductsRows}</Table.Tbody>
              </Table>
            </Paper>
        )}

        {can('quotes.view_all') && salespersonRanking.length > 0 && (
            <Paper withBorder p="md" radius="md" shadow="sm">
              <Title order={5} mb="md">Ranking Vendas</Title>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Vendedor</Table.Th>
                    <Table.Th style={{textAlign: 'right'}}>Vendas</Table.Th>
                    <Table.Th style={{textAlign: 'right'}}>Total</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>{topSalespeopleRows}</Table.Tbody>
              </Table>
            </Paper>
        )}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 1 }}>
        {can('quotes.view') && stats.quotesOverTime.length > 0 && (
          <Paper withBorder p="md" radius="md" shadow="sm">
            <Title order={5} mb="md">Evolução de Orçamentos</Title>
            <AreaChart h={300} data={stats.quotesOverTime} dataKey="date" series={[{ name: 'count', color: 'blue.6', label: 'Quantidade' }]} curveType="monotone" xAxisProps={{ tick: { fill: chartTextColor, fontSize: 12 } }} yAxisProps={{ tick: { fill: chartTextColor, fontSize: 12 } }} tooltipProps={{ content: ({ label, payload }) => <ChartTooltip label={label} payload={payload} /> }} gridAxis="xy" />
          </Paper>
        )}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        {(can('stock.manage') && lowStockProducts.length > 0) || (can('quotes.view') && staleQuotes.length > 0) ? (
          <Paper withBorder p="md" radius="md" shadow="sm" bg="var(--mantine-color-body)">
            <Group mb="md">
              <IconAlertTriangle color="orange" />
              <Title order={5}>Pontos de Atenção</Title>
            </Group>
            
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              {can('stock.manage') && lowStockProducts.length > 0 && (
                <div>
                  <Text fw={500} size="sm" mb="xs" c="dimmed">Estoque Baixo</Text>
                  <List spacing="xs" size="sm" center icon={ <ThemeIcon color="red" size={20} radius="xl"><IconAlertTriangle size={12} /></ThemeIcon> }>
                    {lowStockProducts.map(product => (
                      <List.Item key={product.id}>
                        <Group justify="space-between">
                          <Text>{product.name}</Text>
                          <Text c="red" fw={700}>{product.quantity_in_stock} un.</Text>
                        </Group>
                      </List.Item>
                    ))}
                  </List>
                </div>
              )}

              {can('quotes.view') && staleQuotes.length > 0 && (
                <div>
                  <Text fw={500} size="sm" mb="xs" c="dimmed">Orçamentos Parados (+7 dias)</Text>
                  <List spacing="xs" size="sm" center icon={ <ThemeIcon color="orange" size={20} radius="xl"><IconClockHour4 size={12} /></ThemeIcon> }>
                    {staleQuotes.map(quote => (
                      <List.Item key={quote.id}>
                        <Group justify="space-between">
                          <Text lineClamp={1} style={{flex: 1}}>{quote.customer.name} ({differenceInDays(new Date(), new Date(quote.created_at))} dias)</Text>
                          <Button component={Link} to={`/quotes/${quote.id}`} size="compact-xs" variant="subtle">Ver</Button>
                        </Group>
                      </List.Item>
                    ))}
                  </List>
                </div>
              )}
            </SimpleGrid>
          </Paper>
        ) : null}
        
        {can('settings.manage') && (
          <Stack>
            <PlanUsageWidget />
          </Stack>
        )}
      </SimpleGrid>
    </Stack>
  </Container>
  );
}

export default DashboardPage;