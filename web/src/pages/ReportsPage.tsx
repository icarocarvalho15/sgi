import { useEffect, useState } from 'react';
import { Container, Title, Tabs, Group, SegmentedControl } from '@mantine/core';
import { DatePickerInput, type DatesRangeValue } from '@mantine/dates';
import { startOfMonth, endOfMonth, subMonths, subDays } from 'date-fns';
import { SalesByPeriodReport } from '../components/reports/SalesByPeriodReport';
import { SalesByCustomerReport } from '../components/reports/SalesByCustomerReport';
import { ItemsSoldByDayReport } from '../components/reports/ItemsSoldByDayReport';
import { CashFlowReport } from '../components/reports/CashFlowReport';
import { AuditTab } from '../components/reports/AuditTab';

const adjustDateForTimezone = (date: Date | string | null): Date | null => {
    if (!date) return null;
    const newDate = new Date(date);
    newDate.setMinutes(newDate.getMinutes() + newDate.getTimezoneOffset());
    return newDate;
};

function ReportsPage() {
    const [period, setPeriod] = useState('this_month');
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([startOfMonth(new Date()), endOfMonth(new Date())]);

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

    return (
        <Container>
            <Group justify="space-between" mb="xl">
                <Title order={1}>Relatórios Gerenciais</Title>
                <SegmentedControl value={period} onChange={(value) => { setPeriod(value); if (value !== 'custom') { const today = new Date(); if (value === 'this_month') setDateRange([startOfMonth(today), endOfMonth(today)]); }}} data={[ { label: 'Hoje', value: 'today' }, { label: 'Últimos 7 dias', value: 'last_7_days' },{ label: 'Este Mês', value: 'this_month' }, { label: 'Mês Passado', value: 'last_month' }, { label: 'Customizado', value: 'custom' }, ]} />
            </Group>
            
            {period === 'custom' && (
                <Group grow mb="xl" align="flex-start">
                    <DatePickerInput type="range" label="Selecione o período" placeholder="De - Até" valueFormat="DD/MM/YYYY" value={dateRange} onChange={(value: DatesRangeValue) => { const [start, end] = value; setDateRange([adjustDateForTimezone(start), adjustDateForTimezone(end)]); }} mb="xl" />
                </Group>
            )}

            <Tabs defaultValue="summary" mt="xl">
                <Tabs.List>
                    <Tabs.Tab value="summary">Resumo de Vendas</Tabs.Tab>
                    <Tabs.Tab value="by_customer">Vendas por Cliente</Tabs.Tab>
                    <Tabs.Tab value="items_sold">Itens Vendidos</Tabs.Tab>
                    <Tabs.Tab value="cash_flow">Fluxo de Caixa</Tabs.Tab>
                    <Tabs.Tab value="audit">Auditoria</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="summary" pt="xs">
                    <SalesByPeriodReport dateRange={dateRange} />
                </Tabs.Panel>
                
                <Tabs.Panel value="by_customer" pt="xs">
                    <SalesByCustomerReport dateRange={dateRange} />
                </Tabs.Panel>
                
                <Tabs.Panel value="items_sold" pt="xs">
                    <ItemsSoldByDayReport dateRange={dateRange} />
                </Tabs.Panel>
                
                <Tabs.Panel value="cash_flow" pt="xs">
                    <CashFlowReport />
                </Tabs.Panel>

                <Tabs.Panel value="audit" pt="xs">
                    <AuditTab />
                </Tabs.Panel>
            </Tabs>
        </Container>
    );
}

export default ReportsPage;