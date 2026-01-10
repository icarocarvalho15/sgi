import { Fragment, useCallback, useEffect, useState } from 'react';
import { Table, Title, Container, Group, Pagination, TextInput, Select, ActionIcon, Collapse, Paper, Text, Menu, Anchor, Tooltip, ThemeIcon, Button, Modal, Textarea, Loader, List } from '@mantine/core';
import { IconAlertTriangle, IconChevronDown, IconDotsVertical, IconFile, IconFileExport, IconFileText, IconPrinter, IconSearch, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../context/AuthContext';
import { useDisclosure } from '@mantine/hooks';
import api from '../api/axios';
import type { ProductionOrder, ProductionStatus, SelectOption, QuoteItem } from '../types';

function ProductionPage() {
  const { can } = useAuth();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [activePage, setActivePage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderIds, setExpandedOrderIds] = useState<number[]>([]);
  const [productionStatuses, setProductionStatuses] = useState<SelectOption[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [cancelModalOpened, { open: openCancelModal, close: closeCancelModal }] = useDisclosure(false);
  const [orderToCancel, setOrderToCancel] = useState<ProductionOrder | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPrintingId, setIsPrintingId] = useState<number | null>(null);
  
  const fetchOrders = useCallback((page: number, search: string) => {
    api.get('/production-orders', { params: { page, search } })
    .then(response => {
      setOrders(response.data.data);
      setTotalPages(response.data.last_page);
    })
    .catch(error => console.error('Houve um erro!', error));
  }, []);

  useEffect(() => {
    fetchOrders(activePage, searchQuery);
    api.get('/production-statuses').then(res => {
      setProductionStatuses(res.data.map((ps: ProductionStatus) => ({ value: String(ps.id), label: ps.name })));
    });
  }, [activePage, searchQuery, fetchOrders]);
  
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setActivePage(1);setSearchQuery(searchTerm);
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleStatusChange = (order: ProductionOrder, newStatusId: string | null) => {
    if (!newStatusId) return;
    const selectedStatus = productionStatuses.find(s => s.value === newStatusId);
    if (selectedStatus?.label === 'Cancelado') {
      setOrderToCancel(order);
      setCancellationReason('');
      openCancelModal();
    } else {
      api.put(`/production-orders/${order.id}`, { status_id: newStatusId })
      .then(res => {
        setOrders(current => current.map(o => (o.id === order.id ? res.data : o)));
        notifications.show({ title: 'Sucesso!', message: 'Status do pedido atualizado.', color: 'green' });
      })
      .catch(() => notifications.show({ title: 'Erro!', message: 'Não foi possível atualizar o status.', color: 'red' }));
    }
  };

  const handleConfirmCancellation = () => {
    if (!orderToCancel || cancellationReason.trim() === '') {
      notifications.show({ title: 'Atenção', message: 'O motivo do cancelamento é obrigatório.', color: 'yellow' });
      return;
    }
    const canceledStatus = productionStatuses.find(s => s.label === 'Cancelado');
    if (!canceledStatus) return;
    setIsCancelling(true);
    api.put(`/production-orders/${orderToCancel.id}`, {
      status_id: canceledStatus.value,
      cancellation_reason: cancellationReason
    })
    .then(res => {
      setOrders(current => current.map(o => (o.id === orderToCancel.id ? res.data : o)));
      notifications.show({ title: 'Sucesso!', message: 'Ordem de produção cancelada.', color: 'green' });
      closeCancelModal();
    })
    .catch(() => notifications.show({ title: 'Erro!', message: 'Não foi possível cancelar o pedido.', color: 'red' }))
    .finally(() => setIsCancelling(false));
  };

  const handleDelete = (orderId: number) => {
    if (window.confirm('Tem certeza que deseja apagar esta ordem de produção? Esta ação não pode ser desfeita.')) {
      api.delete(`/production-orders/${orderId}`)
      .then(() => {
        notifications.show({
          title: 'Sucesso',
          message: `Ordem de Produção Nº ${orderId} foi apagada.`,
          color: 'green',
        });
        fetchOrders(activePage, searchQuery);
      })
      .catch(error => {
        console.error(`Erro ao apagar a ordem ${orderId}`, error);
        notifications.show({
          title: 'Erro!',
          message: 'Não foi possível apagar a ordem de produção.',
          color: 'red',
        });
      });
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    api.get('/production-orders/export', { responseType: 'blob' })
    .then(response => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'ordens-de-producao.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    })
    .finally(() => setIsExporting(false));
  };
  
  const handlePrintPdf = (orderId: number, type: 'work-order' | 'delivery-protocol') => {
    setIsPrintingId(orderId);
    const url = type === 'work-order'
    ? `/production-orders/${orderId}/work-order-pdf`
    : `/production-orders/${orderId}/delivery-protocol-pdf`;
    api.get(url, { responseType: 'blob' })
    .then(response => {
      const file = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, '_blank');
    })
    .catch(error => {
      console.error(`Erro ao gerar PDF (${type}):`, error);
      notifications.show({ title: 'Erro!', message: 'Não foi possível gerar o PDF.', color: 'red' });
    })
    .finally(() => setIsPrintingId(null));
  };

  const rows = orders.map((order) => {
    const isExpanded = expandedOrderIds.includes(order.id);
    return (
    <Fragment key={order.id}>
      <Table.Tr>
        <Table.Td>
          <ActionIcon onClick={() => setExpandedOrderIds((current) => isExpanded ? current.filter((id) => id !== order.id) : [...current, order.id])} disabled={order.quote.items.length === 0}>
            <IconChevronDown style={{ transition: 'transform 200ms ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', }} />
          </ActionIcon>
        </Table.Td>
        <Table.Td>{order.internal_id}</Table.Td>
        <Table.Td>{order.quote?.internal_id ?? 'N/A'}</Table.Td>
        <Table.Td>{order.customer?.name || 'N/A'}</Table.Td>
        {can('production_orders.view_all') && <Table.Td>{order.user?.name || 'N/A'}</Table.Td>}
        <Table.Td style={{ width: 200 }}>
          <Select value={String(order.status_id || '')} onChange={(value) => handleStatusChange(order, value)} data={productionStatuses} disabled={order.status?.name === 'Cancelado' || order.status?.name === 'Concluído'} variant="unstyled" styles={(theme) => { const color = order.status?.color || 'gray'; if (!theme.colors[color]) return {}; return { input: { backgroundColor: theme.colors[color][1], color: theme.colors[color][9], fontWeight: 700, textAlign: 'center', border: `1px solid ${theme.colors[color][2]}`, paddingRight: '1.75rem', }, }; }} />
        </Table.Td>
        <Table.Td>{order.created_at ? new Date(order.created_at).toLocaleDateString('pt-BR') : 'N/A'}</Table.Td>
        <Table.Td>
          <Menu shadow="md" width={250}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Ações do Pedido</Menu.Label>
              <Menu.Item leftSection={isPrintingId === order.id ? <Loader size={14} /> : <IconPrinter size={14} />} onClick={() => handlePrintPdf(order.id, 'work-order')} disabled={isPrintingId !== null} >Imprimir Ordem de Serviço</Menu.Item>
              <Menu.Item leftSection={isPrintingId === order.id ? <Loader size={14} /> : <IconFileText size={14} />} onClick={() => handlePrintPdf(order.id, 'delivery-protocol')} disabled={isPrintingId !== null} >Imprimir Protocolo de Entrega</Menu.Item>
              {can('production_orders.delete') && (<><Menu.Divider /><Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => handleDelete(order.id)}>Apagar Ordem de Produção</Menu.Item></>)}
            </Menu.Dropdown>
          </Menu>
        </Table.Td>
      </Table.Tr>
      <Table.Tr>
        <Table.Td colSpan={8} style={{ padding: '0.05rem 0.10rem', border: 0 }}>
          <Collapse in={isExpanded}>
          <Paper p="md" withBorder bg="var(--mantine-color-body)" radius={0}>
            <Title order={6}>Itens do Pedido</Title>
            <Table verticalSpacing="xs" mt="xs" bg="var(--mantine-color-body)">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Produto</Table.Th>
                  <Table.Th>Qtd.</Table.Th>
                  <Table.Th>Materiais Necessários (para 1 un.)</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{order.quote.items.map((item: QuoteItem) => (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      {!item.is_custom_item && item.product && item.product.quantity_in_stock < 0 && (
                        <Tooltip label={`Estoque atual: ${item.product.quantity_in_stock}. Reposição necessária!`} color="red">
                          <ThemeIcon color="red" variant="light" size="sm" radius="xl">
                            <IconAlertTriangle size={14} />
                          </ThemeIcon>
                        </Tooltip>
                      )}
                      <Text size="sm">
                        {item.is_custom_item ? (item.product_name || 'Item Avulso') : (item.product?.name || item.product_name || 'Produto Não Encontrado')}
                      </Text>
                    </Group>
                    {item.notes && <Text size="xs" c="dimmed" mt={4}>Obs: {item.notes}</Text>}
                    {item.file_path && (
                      <Anchor href={`${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}/storage/${item.file_path}`} target="_blank" size="xs">
                        <Group gap="xs" mt={4}><IconFile size={14} /> Ver Anexo</Group>
                      </Anchor>
                    )}
                  </Table.Td>
                  <Table.Td>{item.quantity}</Table.Td>
                  <Table.Td>
                    {item.is_custom_item ? (
                      <Text size="xs" c="dimmed" fs="italic">Item Avulso / Sob Demanda (sem ficha técnica)</Text>
                    ) : (
                      item.product && item.product.type === 'servico' && item.product.components && item.product.components.length > 0 ? (
                        <List size="xs">
                          {item.product.components.map(comp => (
                            <List.Item key={comp.id}>
                              {comp.component.name} (x{Number(comp.quantity_used)})
                            </List.Item>
                          ))}
                        </List>
                      ) : (
                      <Text size="xs" c="dimmed">
                        {item.product?.type === 'servico' ? 'Sem composição' : 'Produto Físico (Baixa direta)'}
                      </Text>
                      )
                    )}
                  </Table.Td>
                </Table.Tr>))}
              </Table.Tbody>
            </Table>
          </Paper>
          </Collapse>
        </Table.Td>
      </Table.Tr>
    </Fragment>
    );
  });
  
  return (
  <Container>
    <Modal opened={cancelModalOpened} onClose={closeCancelModal} title={`Cancelar Pedido Nº ${orderToCancel?.internal_id}`}>
      <Textarea label="Motivo do Cancelamento" placeholder="Descreva por que este pedido está sendo cancelado..." required autosize minRows={3} value={cancellationReason} onChange={(event) => setCancellationReason(event.currentTarget.value)} />
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={closeCancelModal}>Voltar</Button>
        <Button color="red" onClick={handleConfirmCancellation} loading={isCancelling}>Confirmar Cancelamento</Button>
      </Group>
    </Modal>
    <Group justify="space-between" my="lg">
      <Title order={1}>Ordens de Produção</Title>
      <Group>
        {can('production_orders.view_all') && (<Button onClick={handleExport} loading={isExporting} color="green" leftSection={<IconFileExport size={16} />}>Exportar</Button>)}
      </Group>
      </Group>
    <TextInput label="Buscar Ordem de Produção" placeholder="Digite o Nº, nome do cliente ou status..." value={searchTerm} onChange={(event) => setSearchTerm(event.currentTarget.value)} leftSection={<IconSearch size={16} />} mb="md" />
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th w={40} />
          <Table.Th>Nº do Pedido</Table.Th>
          <Table.Th>Nº do Orçamento</Table.Th>
          <Table.Th>Cliente</Table.Th>
          {can('production_orders.view_all') && <Table.Th>Vendedor</Table.Th>}
          <Table.Th>Status</Table.Th>
          <Table.Th>Data de Criação</Table.Th>
          <Table.Th>Ações</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows.length > 0 ? rows : (
        <Table.Tr>
          <Table.Td colSpan={8} align="center">Nenhuma ordem de produção encontrada.</Table.Td>
        </Table.Tr> )}
      </Table.Tbody>
    </Table>
    <Group justify="center" mt="xl">
      <Pagination total={totalPages} value={activePage} onChange={setActivePage} />
    </Group>
  </Container>
  );
}

export default ProductionPage;
