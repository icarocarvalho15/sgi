import { useEffect, useState } from 'react';
import { Paper, Text, Timeline, Group, Badge, Loader, Alert, Stack, ThemeIcon } from '@mantine/core';
import { IconGitCommit, IconInfoCircle, IconShieldLock, IconArrowRight, IconCheckbox } from '@tabler/icons-react';
import api from '../../api/axios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { LogActivity } from '../../types';

const FIELD_LABELS: Record<string, string> = {
    // Produtos
    sale_price: 'Preço de Venda',
    price: 'Preço',
    sku: 'Código',
    category_id: 'Categoria',
    cost_price: 'Preço de Custo',
    name: 'Nome',
    description: 'Descrição',
    quantity_in_stock: 'Estoque Atual',
    stock_quantity: 'Estoque Atual',
    quantity: 'Estoque',
    active: 'Ativo',
    image_path: 'Imagem',

    // Clientes e Endereços
    type: 'Tipo',
    legal_name: 'Nome Fantasia',
    email: 'E-mail',
    phone: 'Telefone / WhatsApp',
    document: 'CPF / CNPJ',
    street: 'Rua',
    number: 'Número',
    neighborhood: 'Bairro',
    complement: 'Complemento',
    city: 'Cidade',
    state: 'Estado',
    cep: 'CEP',
    notes: 'Observações',

    // Genéricos
    created_at: 'Data de Criação',
    updated_at: 'Data de Atualização',
};

export function AuditTab() {
    const [logs, setLogs] = useState<LogActivity[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        api.get('/audit-logs')
        .then(res => setLogs(res.data.data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }, []);

    const formatPhone = (v: string) => {
        const r = v.replace(/\D/g, "");
        if (r.length > 10) {
            return r.replace(/^(\d\d)(\d{5})(\d{4}).*/, "($1) $2-$3");
        } else if (r.length > 5) {
            return r.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, "($1) $2-$3");
        } else if (r.length > 2) {
            return r.replace(/^(\d\d)(\d{0,5}).*/, "($1) $2");
        } else {
            return v;
        }
    };
    
    const formatValue = (key: string, value: any) => {
        if (value === null || value === undefined || value === '') return <em>Vazio</em>;        
        if (['price', 'sale_price', 'cost_price'].includes(key)) {
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
        }
        if (key === 'phone') {
            return formatPhone(String(value));
        }
        if (typeof value === 'boolean' || key === 'active') {
            return value ? <Badge color="green">Sim</Badge> : <Badge color="red">Não</Badge>;
        }
        return String(value);
    };

    const renderChanges = (attributes: any, old?: any) => {
        return Object.entries(attributes).map(([key, newValue]) => {
            if (['updated_at', 'created_at', 'id', 'tenant_id'].includes(key)) return null;
            
            const label = FIELD_LABELS[key] || key;
            const oldValue = old ? old[key] : null;
            
            return (
            <Group key={key} mt={4} align="center" gap="xs">
                <Text size="sm" fw={600} c="dimmed">• {label}:</Text>
                {oldValue && (
                    <>
                        <Text size="sm" td="line-through" c="gray.5" lineClamp={1} style={{ maxWidth: 150 }}>{formatValue(key, oldValue)}</Text>
                        <IconArrowRight size={12} color="gray" />
                    </>
                )}
                <Text size="sm" fw={600} c="dark" lineClamp={2}>{formatValue(key, newValue)}</Text>
            </Group>
            );
        });
    };
    
    if (loading) return <Stack align="center" py="xl"><Loader /><Text size="sm">Carregando auditoria...</Text></Stack>;
    
    if (logs.length === 0) {
        return (
        <Alert icon={<IconInfoCircle size={16} />} title="Sem registros" color="blue" variant="light">
            Nenhuma atividade recente registrada.
        </Alert>
        );
    }
    
    return (
    <Paper p="md" radius="md" withBorder>
        <Group mb="lg">
            <ThemeIcon color="grape" variant="light" size="lg"><IconShieldLock size={20} /></ThemeIcon>
            <Text fw={600} size="lg">Registro de Atividades</Text>
        </Group>
        
        <Timeline active={logs.length} bulletSize={24} lineWidth={2}>
            {logs.map((log) => (
                <Timeline.Item key={log.id} bullet={log.event === 'production_finished' ? <IconCheckbox size={12} /> : <IconGitCommit size={12} />} title={
                    <Group gap="xs">
                        <Text fw={700}>{log.causer?.name || 'Sistema'}</Text>
                        {log.event === 'deleted' && <Badge size="sm" color="red">Deletou</Badge>}
                        {log.event === 'created' && <Badge size="sm" color="green">Criou</Badge>}
                        {log.event === 'updated' && <Badge size="sm" color="blue">Editou</Badge>}
                        {log.event === 'production_finished' && <Badge size="sm" variant="filled" color="teal">Conclusão de Produção</Badge>}
                        {log.subject?.name && <Text size="sm" c="dimmed">o item <b>{log.subject.name}</b></Text>}
                    </Group>
                }>
                    <Text c="dimmed" size="xs" mb={4}>{format(new Date(log.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</Text>
                    {log.properties?.attributes && (
                    <Paper bg="gray.0" p="xs" radius="md" withBorder style={{ borderColor: 'var(--mantine-color-gray-3)' }}>
                        {renderChanges(log.properties.attributes, log.properties.old)}
                    </Paper>
                )}
                </Timeline.Item>
            ))}
        </Timeline>
    </Paper>
    );
}