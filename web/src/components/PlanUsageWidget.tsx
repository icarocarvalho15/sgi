import { useEffect, useState } from 'react';
import { Paper, Text, Group, RingProgress, Center, Stack, ThemeIcon, Loader, Badge, Button } from '@mantine/core';
import { IconUser, IconPackage, IconCrown, IconBrandWhatsapp } from '@tabler/icons-react';
import api from '../api/axios';

interface UsageItem {
    label: string;
    current: number;
    max: number;
    percent: number;
    is_unlimited: boolean;
}

interface PlanData {
    tenant_name: string;
    plan_name: string;
    features: {
        users: UsageItem;
        products: UsageItem;
    };
}

export function PlanUsageWidget() {
    const [data, setData] = useState<PlanData | null>(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        api.get('/tenant/plan-usage')
        .then(res => setData(res.data))
        .catch(err => console.error("Erro ao carregar plano", err))
        .finally(() => setLoading(false));
    }, []);

    if (loading) return <Paper withBorder p="md"><Center><Loader size="sm" /></Center></Paper>;
    
    if (!data) return null;
    
    const isCritical = Object.values(data.features).some(f => f.percent >= 70 && !f.is_unlimited);
    
    const handleUpgradeClick = () => {
        const text = `Olá! Sou da empresa *${data.tenant_name}* (Plano Atual: ${data.plan_name}) e gostaria de fazer um upgrade no meu plano do SGI.`;
        window.open(`https://wa.me/5586995567270?text=${encodeURIComponent(text)}`, '_blank');
    };
    
    const renderRing = (item: UsageItem, icon: React.ReactNode, color: string) => {
        if (item.is_unlimited) {
            return (
            <Group>
                <ThemeIcon color={color} variant="light" size="lg" radius="xl">{icon}</ThemeIcon>
                <div>
                    <Text size="xs" c="dimmed">{item.label}</Text>
                    <Text fw={700}>Ilimitado</Text>
                </div>
            </Group>
            );
        }
        
        return (
        <Group>
            <RingProgress size={80} roundCaps thickness={8} sections={[{ value: item.percent, color: item.percent >= 90 ? 'red' : color }]} label={ <Center><ThemeIcon color={item.percent >= 90 ? 'red' : color} variant="transparent" size="xl">{icon}</ThemeIcon></Center> } />
            <div>
                <Text c="dimmed" size="xs" tt="uppercase" fw={700}>{item.label}</Text>
                <Text fw={700} size="xl">{item.current} <Text span size="sm" c="dimmed">/ {item.max}</Text></Text>
            </div>
        </Group>
        );
    };
    
    return (
    <Paper withBorder p="md" radius="md">
        <Group justify="space-between" mb="md">
            <Group gap="xs">
                <IconCrown size={20} color="orange" />
                <Text fw={500}>{data.plan_name}</Text>
            </Group>
            <Badge variant="light" color="gray">Sua Assinatura</Badge>
        </Group>
        
        <Stack gap="xl" mb={isCritical ? 'md' : 0}>
            {renderRing(data.features.users, <IconUser size={20} />, 'blue')}
            {renderRing(data.features.products, <IconPackage size={20} />, 'teal')}
        </Stack>
        
        {isCritical && (
            <Button fullWidth variant="gradient" gradient={{ from: 'orange', to: 'red' }} leftSection={<IconBrandWhatsapp size={18} />} onClick={handleUpgradeClick}>Aumentar Meus Limites</Button>
        )}
    </Paper>
    );
}