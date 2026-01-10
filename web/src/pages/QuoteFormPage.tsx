import { useEffect, useState } from 'react';
import { Container, Title, Select, Button, Group, Table, NumberInput, Paper, Grid, Textarea, Divider, ActionIcon, Tooltip, Fieldset, TextInput, Text, Modal, FileInput, Anchor, Switch } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useParams } from 'react-router-dom';
import { IconTrash, IconPrinter, IconPencil, IconUpload, IconFile, IconX, IconPackage, IconCubeSend } from '@tabler/icons-react';
import api from '../api/axios';
import type { SelectOption, Status, Product, Quote, QuoteItem, PaymentTerm, PaymentMethod, DeliveryMethod, NegotiationSource } from '../types';

const formatPhone = (phone: string = '') => {
  const cleaned = phone.replace(/\D/g, '').substring(0, 11);
  if (!cleaned) return '';
  const length = cleaned.length;
  if (length <= 2) return `(${cleaned}`;
  if (length <= 6) return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2)}`;
  if (length <= 10) return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatPercentage = (value: number | string | null | undefined): string => {
  const num = Number(value);
  if (isNaN(num)) {
    return '0.00%';
  }
  return `${num.toFixed(2)}%`;
};

const calculateProfitMargin = (cost: number, sale: number): number => {
  if (sale <= 0 || cost > sale || cost <= 0) return 0;
  return parseFloat((((sale - cost) / sale) * 100).toFixed(2));
};

const formatDocument = (doc: string = '', type: 'fisica' | 'juridica' = 'fisica') => {
  const cleaned = doc.replace(/\D/g, '');
  if (type === 'fisica') {
    return cleaned.substring(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2');
  }
  return cleaned.substring(0, 14).replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
};

function QuoteFormPage() {
  const { quoteId } = useParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [initialStatus, setInitialStatus] = useState<string | null>(null);
  const [isSavingHeader, setIsSavingHeader] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<SelectOption[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<SelectOption[]>([]);
  const [deliveryMethods, setDeliveryMethods] = useState<SelectOption[]>([]);
  const [quoteStatuses, setQuoteStatuses] = useState<SelectOption[]>([]);
  const [negotiationSources, setNegotiationSources] = useState<SelectOption[]>([]);
  const [isCustomItem, setIsCustomItem] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number | string>(1);
  const [customName, setCustomName] = useState('');
  const [customCost, setCustomCost] = useState<number | string>(0);
  const [customPrice, setCustomPrice] = useState<number | string>(0);
  const [itemModalOpened, { open: openItemModal, close: closeItemModalHook }] = useDisclosure(false);
  const [editingItem, setEditingItem] = useState<QuoteItem | null>(null);
  const [docModalOpened, { open: openDocModal, close: closeDocModal }] = useDisclosure(false);
  const [customerToUpdate, setCustomerToUpdate] = useState<{ id: number; document: string; type: 'fisica' | 'juridica' } | null>(null);
  const [cancelModalOpened, { open: openCancelModal, close: closeCancelModal }] = useDisclosure(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const isLocked = initialStatus === 'Aprovado' || initialStatus === 'Cancelado';
    
  const itemForm = useForm({
    initialValues: {
      quantity: 1,
      unit_sale_price: 0,
      discount_percentage: 0,
      profit_margin: 0,
      notes: '',
      file: null as File | null,
      product_name: '',
    },
  });

  useEffect(() => {
    if (!editingItem) return;
    const cost = Number(editingItem.unit_cost_price);
    const sale = Number(itemForm.values.unit_sale_price);
    const newMargin = calculateProfitMargin(cost, sale);
    if (Number(itemForm.values.profit_margin).toFixed(2) !== newMargin.toFixed(2)) {
      itemForm.setFieldValue('profit_margin', newMargin);
    }
  }, [itemForm.values.unit_sale_price]);
  
  useEffect(() => {
    api.get('/products', { params: { per_page: 1000 } }).then(res => setProducts(res.data.data));
    api.get('/payment-methods').then(res => setPaymentMethods(res.data.map((pm: PaymentMethod) => ({ value: String(pm.id), label: pm.name }))));
    api.get('/delivery-methods').then(res => setDeliveryMethods(res.data.map((dm: DeliveryMethod) => ({ value: String(dm.id), label: dm.name }))));
    api.get('/quote-statuses').then(res => setQuoteStatuses(res.data.map((qs: Status) => ({ value: String(qs.id), label: qs.name }))));
    api.get('/negotiation-sources').then(res => setNegotiationSources(res.data.map((ns: NegotiationSource) => ({ value: String(ns.id), label: ns.name }))));
    api.get('/payment-terms').then(res => setPaymentTerms(res.data.map((pt: PaymentTerm) => ({ value: String(pt.id), label: pt.name, }))));
  }, []);
  
  useEffect(() => {
    if (quoteId) {
      api.get(`/quotes/${quoteId}`).then(res => {
        setQuote(res.data);
        setInitialStatus(res.data.status?.name || null);
      });
    }
  }, [quoteId]);
  
  const updateQuoteField = (field: keyof Quote, value: string | number | Date | null) => {
    setQuote(currentQuote => {
      if (!currentQuote) return null;
      return { ...currentQuote, [field]: value };
    });
  };

  const handleStatusChange = (value: string | null) => {
    if (!value) {
      updateQuoteField('status_id', null);
      return;
    }
    const selectedStatus = quoteStatuses.find(s => s.value === value);
    if (selectedStatus?.label === 'Cancelado') {
      openCancelModal();
    } else {
      updateQuoteField('status_id', Number(value));
    }
  };
  
  const handleConfirmCancellation = () => {
    if (!quote || cancellationReason.trim() === '') {
      notifications.show({ title: 'Atenção', message: 'O motivo do cancelamento é obrigatório.', color: 'yellow' });
      return;
    }
    const canceledStatus = quoteStatuses.find(s => s.label === 'Cancelado');
    if (!canceledStatus) {
      notifications.show({ title: 'Erro de Configuração', message: 'Status "Cancelado" não encontrado.', color: 'red' });
      return;
    }
    const payload = {
      payment_method_id: quote.payment_method_id,
      payment_term_id: quote.payment_term_id,
      delivery_method_id: quote.delivery_method_id,
      status_id: Number(canceledStatus.value),
      negotiation_source_id: quote.negotiation_source_id,
      delivery_datetime: quote.delivery_datetime,
      discount_percentage: quote.discount_percentage,
      notes: quote.notes,
      cancellation_reason: cancellationReason,
    };
    setIsSavingHeader(true);
    api.put(`/quotes/${quote.id}`, payload)
    .then(res => {
      setQuote(res.data);
      setInitialStatus(res.data.status?.name || null);
      notifications.show({ title: 'Sucesso!', message: 'Orçamento cancelado com sucesso.', color: 'green' });
      closeCancelModal();
      setCancellationReason('');
    })
    .catch((error) => {
      console.error("Erro ao cancelar orçamento:", error);
      notifications.show({ title: 'Erro!', message: 'Não foi possível cancelar o orçamento.', color: 'red' });
    })
    .finally(() => setIsSavingHeader(false));
  };

  const handleAddItem = () => {
    if (!quoteId) return;
    const numericQuantity = Number(quantity);
    let payload: any = { quantity: numericQuantity };
    if (isCustomItem) {
      if (!customName.trim()) {
        return notifications.show({ title: 'Erro', message: 'Digite o nome do item avulso.', color: 'red' });
      }
      if (Number(customPrice) <= 0) {
        return notifications.show({ title: 'Erro', message: 'O preço de venda deve ser maior que zero.', color: 'red' });
      }
      payload = {
        ...payload,
        is_custom_item: true,
        product_id: null,
        product_name: customName,
        unit_cost_price: Number(customCost),
        unit_sale_price: Number(customPrice),
      };
    } else {
      if (!selectedProduct) return notifications.show({ title: 'Erro', message: 'Selecione um produto.', color: 'red' });
      const productDetails = products.find(p => String(p.id) === selectedProduct);
      if (productDetails && productDetails.type === 'produto' && numericQuantity > productDetails.quantity_in_stock) {
        notifications.show({
          title: 'Atenção: Estoque',
          message: `O produto "${productDetails.name}" possui apenas ${productDetails.quantity_in_stock} unidades.`,
          color: 'yellow',
          autoClose: 8000,
        });
      }
      payload = {
        ...payload,
        product_id: selectedProduct,
        is_custom_item: false
      };
    }
    api.post(`/quotes/${quoteId}/items`, payload)
    .then(res => {
      setQuote(res.data);
      setQuantity(1);
      if (isCustomItem) {
        setCustomName('');
        setCustomCost(0);
        setCustomPrice(0);
      } else {
        setSelectedProduct(null);
      }
      notifications.show({ title: 'Sucesso!', message: 'Item adicionado.', color: 'green' });
    })
    .catch((err) => {
      console.error(err);
      notifications.show({ title: 'Erro!', message: 'Não foi possível adicionar o item.', color: 'red' });
    });
  };
  
  const handleOpenEditItemModal = (item: QuoteItem) => {
    setEditingItem(item);
    itemForm.setValues({
      quantity: item.quantity,
      unit_sale_price: item.unit_sale_price,
      discount_percentage: item.discount_percentage,
      notes: item.notes || '',
      file: null,
      product_name: item.product_name,
    });
    openItemModal();
  };

  const handleUpdateHeader = () => {
    if (!quote) return;
    setIsSavingHeader(true);
    const payload = {
      payment_method_id: quote.payment_method_id,
      payment_term_id: quote.payment_term_id,
      delivery_method_id: quote.delivery_method_id,
      status_id: quote.status_id,
      negotiation_source_id: quote.negotiation_source_id,
      delivery_datetime: quote.delivery_datetime,
      discount_percentage: quote.discount_percentage,
      notes: quote.notes,
    };
    api.put(`/quotes/${quoteId}`, payload)
    .then(res => {
      setQuote(res.data);
      setInitialStatus(res.data.status?.name || null);
      notifications.show({ title: 'Sucesso!', message: 'Alterações salvas.', color: 'green' });
    })
    .catch((error) => {
      if (error.response?.data?.action_required === 'COLLECT_DOCUMENT') {
        notifications.show({ title: 'Ação Necessária', message: error.response.data.message, color: 'yellow' });
        setCustomerToUpdate({ id: error.response.data.customer_id, document: '', type: quote.customer.type });
        openDocModal();
      } else if (error.response && error.response.status === 422) {
        const validationErrors = error.response.data.errors;
        const errorMessages = Object.values(validationErrors).flat().join('\n');
        notifications.show({
          title: 'Campos Obrigatórios Pendentes',
          message: errorMessages,
          color: 'red',
          autoClose: 10000,
        });
      } else {
        console.error("Erro ao salvar alterações:", error);
        notifications.show({ 
          title: 'Erro!', 
          message: 'Não foi possível salvar as alterações.', 
          color: 'red' 
        });
      }
    })
    .finally(() => setIsSavingHeader(false));
  };
  
  const handleItemUpdate = (values: typeof itemForm.values) => {
    if (!quote || !editingItem) return;
    const data = new FormData();
    data.append('quantity', String(values.quantity));
    data.append('unit_sale_price', String(values.unit_sale_price));
    data.append('discount_percentage', String(values.discount_percentage));
    data.append('notes', values.notes);
    if (editingItem.is_custom_item) {
      data.append('product_name', values.product_name);
    }

    if (values.file) data.append('file', values.file);
    data.append('_method', 'PUT');

    api.post(`/quotes/${quote.id}/items/${editingItem.id}`, data)
    .then(res => {
      setQuote(res.data);
      handleCloseItemModal();
      notifications.show({ title: 'Sucesso!', message: 'Item atualizado.', color: 'green'});
    })
    .catch(() => notifications.show({ title: 'Erro!', message: 'Não foi possível atualizar.', color: 'red'}));
  };

  const handleCloseItemModal = () => {
    closeItemModalHook();
    setEditingItem(null);
    itemForm.reset();
  };
  
  const handleRemoveItem = (itemId: number) => {
    if (!quote) return;
    if (window.confirm('Tem certeza?')) {
      api.delete(`/quotes/${quote.id}/items/${itemId}`).then(res => {
        setQuote(res.data);
        notifications.show({ title: 'Sucesso', message: 'Item removido', color: 'green'});
      });
    }
  };

  const handleRemoveFile = () => {
    if (!quote || !editingItem) return;
    if (window.confirm('Tem certeza que deseja remover o anexo deste item?')) {
      api.delete(`/quote-items/${editingItem.id}/file`)
      .then(res => {
        setQuote(res.data);
        setEditingItem(prev => prev ? { ...prev, file_path: null } : null);
        notifications.show({ title: 'Sucesso!', message: 'Anexo removido.', color: 'green'});
      })
      .catch(() => notifications.show({ title: 'Erro!', message: 'Não foi possível remover o anexo.', color: 'red'}));
    }
  };

  const handleDocumentSubmit = () => {
    if (!customerToUpdate) return;
    api.patch(`/customers/${customerToUpdate.id}/document`, { document: customerToUpdate.document })
    .then(() => {
      notifications.show({ title: 'Sucesso!', message: 'Documento do cliente atualizado.', color: 'green' });
      closeDocModal();
      handleUpdateHeader();
    })
    .catch(() => notifications.show({ title: 'Erro!', message: 'Documento inválido ou já cadastrado.', color: 'red' }));
  };
  
  const handlePrintPdf = () => {
	if (!quote) return;
    setIsPrinting(true);
    api.get(`/quotes/${quote.id}/pdf`, {
        responseType: 'blob',
    }).then(response => {
        const file = new Blob([response.data], { type: 'application/pdf' });
        const fileURL = URL.createObjectURL(file);
        window.open(fileURL, '_blank');
    }).catch(error => {
        console.error("Erro ao gerar PDF:", error);
        notifications.show({ title: 'Erro!', message: 'Não foi possível gerar o PDF.', color: 'red' });
    }).finally(() => {
        setIsPrinting(false);
    });
  };
  
  const itemRows = quote?.items?.map((item) => (
  <Table.Tr key={item.id}>
    <Table.Td>
      <Group gap="xs">
        {item.is_custom_item ?
          <Tooltip label="Item Avulso/Sob Demanda"><IconCubeSend size={16} color="orange" /></Tooltip> : 
          <Tooltip label="Produto Cadastrado"><IconPackage size={16} color="gray" /></Tooltip>
        }
        <Text size="sm">{item.product_name}</Text>
      </Group>
      {item.notes && <Text size="xs" c="dimmed">Obs: {item.notes}</Text>}
      {item.file_path && (
        <Anchor href={`${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}/storage/${item.file_path}`} target="_blank" size="xs">
          <Group gap="xs" mt={4}> <IconFile size={14} /> Ver Anexo </Group>
        </Anchor>
      )}
    </Table.Td>
    <Table.Td>{item.quantity}</Table.Td>
    <Table.Td>{formatCurrency(item.unit_sale_price)}</Table.Td>
    <Table.Td>{formatPercentage(item.profit_margin)}</Table.Td>
    <Table.Td>{formatPercentage(item.discount_percentage)}</Table.Td>
    <Table.Td>{formatCurrency(item.total_price)}</Table.Td>
    <Table.Td>
      <Group gap="xs">
        <Tooltip label="Editar Item"><ActionIcon color="blue" variant="light" onClick={() => handleOpenEditItemModal(item)} disabled={isLocked}><IconPencil size={16} /></ActionIcon></Tooltip>
        <Tooltip label="Remover Item"><ActionIcon color="red" variant="light" onClick={() => handleRemoveItem(item.id)} disabled={isLocked}><IconTrash size={16} /></ActionIcon></Tooltip>
      </Group>
    </Table.Td>
  </Table.Tr>
  ));

  if (!quote || !paymentMethods.length || !paymentTerms.length || !deliveryMethods.length || !quoteStatuses.length || !negotiationSources.length) return <Container><Title>Carregando Orçamento...</Title></Container>;

  return (
    <Container size="xl">
      <Modal opened={docModalOpened} onClose={closeDocModal} title="Documento Obrigatório para Aprovação">
        <Text size="sm" mb="md">Para aprovar este orçamento, é necessário informar o documento do cliente.</Text>
        <TextInput label={customerToUpdate?.type === 'fisica' ? 'CPF' : 'CNPJ'} placeholder="000.000.000-00" value={customerToUpdate ? formatDocument(customerToUpdate.document, customerToUpdate.type) : ''} onChange={(e) => setCustomerToUpdate(c => c ? { ...c, document: e.target.value.replace(/\D/g, '') } : null)} required />
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={closeDocModal}>Cancelar</Button>
          <Button onClick={handleDocumentSubmit}>Salvar e Aprovar</Button>
        </Group>
      </Modal>

      <Modal opened={cancelModalOpened} onClose={closeCancelModal} title="Cancelar Orçamento">
        <Textarea label="Motivo do Cancelamento" placeholder="Descreva por que este orçamento está sendo cancelado..." required autosize minRows={3} value={cancellationReason} onChange={(event) => setCancellationReason(event.currentTarget.value)} />
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={closeCancelModal}>Voltar</Button>
          <Button color="red" onClick={handleConfirmCancellation} loading={isSavingHeader}>Confirmar Cancelamento</Button>
        </Group>
      </Modal>

      <Modal opened={itemModalOpened} onClose={handleCloseItemModal} title={`Editar Item: ${editingItem?.product_name}`}>
        <form onSubmit={itemForm.onSubmit(handleItemUpdate)}>
          <Grid>
            {!!editingItem?.is_custom_item && (
              <Grid.Col span={12}><TextInput label="Nome do Item" {...itemForm.getInputProps('product_name')} /></Grid.Col>
            )}
            <Grid.Col span={6}><NumberInput label="Quantidade" min={1} {...itemForm.getInputProps('quantity')} /></Grid.Col>
            <Grid.Col span={6}><TextInput label="Preço Unit." value={formatCurrency(itemForm.values.unit_sale_price)} onChange={(e) => itemForm.setFieldValue('unit_sale_price', Number(e.target.value.replace(/\D/g, ''))/100)} /></Grid.Col>
            <Grid.Col span={6}><NumberInput label="Lucro (%)" decimalScale={2} {...itemForm.getInputProps('profit_margin')} readOnly /></Grid.Col>
            <Grid.Col span={6}><NumberInput label="Desconto (%)" min={0} max={100} {...itemForm.getInputProps('discount_percentage')} /></Grid.Col>
          </Grid>
          <Textarea mt="md" label="Observações de Personalização" placeholder="Detalhes, medidas, cores..." minRows={3} {...itemForm.getInputProps('notes')} />
          {editingItem?.file_path ? (
            <Paper withBorder p="sm" mt="md">
              <Group justify="space-between">
                <Anchor href={`${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}/storage/${editingItem.file_path}`} target="_blank">
                  <Group gap="xs"><IconFile size={16} /> Ver Anexo Atual</Group>
                </Anchor>
                <Tooltip label="Remover anexo">
                  <ActionIcon color="red" onClick={handleRemoveFile}><IconX size={16} /></ActionIcon>
                </Tooltip>
              </Group>
            </Paper>
          ) : (
            <FileInput mt="md" label="Arquivo de Arte/Referência" placeholder="Anexe um arquivo" leftSection={<IconUpload size={14} />} {...itemForm.getInputProps('file')} clearable />
          )}
          <Group justify="flex-end" mt="lg">
            <Button variant="default" onClick={handleCloseItemModal}>Cancelar</Button>
            <Button type="submit">Salvar Item</Button>
          </Group>
        </form>
      </Modal>

      <Title order={2} mb="lg">Orçamento Nº {quote.internal_id}</Title>
      
      <Paper withBorder p="md">
        <Fieldset legend="Dados do Cliente">
          <Grid>
            <Grid.Col span={12}><TextInput label="Cliente" value={quote.customer_data?.name || ''} readOnly disabled={isLocked} required /></Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}><TextInput label="E-mail" value={quote.customer_data?.email || ''} readOnly disabled={isLocked} required /></Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}><TextInput label="Telefone" value={quote.customer_data?.phone ? formatPhone(quote.customer_data.phone) : ''} readOnly disabled={isLocked} required /></Grid.Col>
            <Grid.Col span={12}><TextInput label="Endereço" value={quote.customer_data?.address || ''} readOnly disabled={isLocked} required /></Grid.Col>
          </Grid>
        </Fieldset>

        <Fieldset legend="Dados Gerais do Orçamento" mt="md">
          <Grid>
            <Grid.Col span={{ base: 12, md: 4 }}><Select label="Status" value={String(quote.status_id || '')} onChange={handleStatusChange} data={quoteStatuses} disabled={isLocked} required /></Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}><Select label="Forma de Pagamento" placeholder="Selecione..." value={String(quote.payment_method_id || '')} onChange={(value) => updateQuoteField('payment_method_id', value ? Number(value) : null)} data={paymentMethods} disabled={isLocked} required /></Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}><Select label="Condição de Pagamento" placeholder="Selecione..." value={String(quote.payment_term_id || '')} onChange={(value) => updateQuoteField('payment_term_id', value ? Number(value) : null)} data={paymentTerms} disabled={isLocked} required /></Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}><Select label="Opção de Entrega" placeholder="Selecione..." value={String(quote.delivery_method_id || '')} onChange={(value) => updateQuoteField('delivery_method_id', value ? Number(value) : null)} data={deliveryMethods} disabled={isLocked} required /></Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}><DateTimePicker label="Data/Hora da Entrega" placeholder="Selecione data e hora" value={quote.delivery_datetime ? new Date(quote.delivery_datetime) : null} onChange={(date) => updateQuoteField('delivery_datetime', date?.toString() || null)} disabled={isLocked} required minDate={new Date()} /></Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}><Select label="Origem da Negociação" placeholder="Selecione..." value={String(quote.negotiation_source_id || '')} onChange={(value) => updateQuoteField('negotiation_source_id', value ? Number(value) : null)} data={negotiationSources} disabled={isLocked} required clearable /></Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}><NumberInput label="Desconto Geral (%)" value={quote.discount_percentage || 0} onChange={(value) => updateQuoteField('discount_percentage', Number(value) || 0)} min={0} max={99} allowDecimal={false} rightSection="%" disabled={isLocked} /></Grid.Col>
            <Grid.Col span={12}><Textarea label="Observações" placeholder="Adicione observações sobre o pedido..." value={quote.notes || ''} onChange={(event) => updateQuoteField('notes', event.currentTarget.value)} disabled={isLocked} autosize minRows={2} /></Grid.Col>
          </Grid>
        </Fieldset>
        
        <Group justify="flex-end" mt="md">
          <Button onClick={handlePrintPdf} loading={isPrinting} variant="default" leftSection={<IconPrinter size={16} />}>Imprimir Orçamento</Button>
          <Button onClick={handleUpdateHeader} loading={isSavingHeader} disabled={isLocked}>Salvar Alterações</Button>
        </Group>
      </Paper>

      <Divider my="xl" label="Itens do Orçamento" labelPosition="center" />

      {!isLocked && (
        <Paper withBorder p="md" mb="xl" bg={isCustomItem ? "orange.0" : undefined}>
          <Group justify="space-between" mb="md">
            <Title order={4}>{isCustomItem ? 'Adicionar Item Avulso / Sob Demanda' : 'Adicionar Produto do Estoque'}</Title>
            <Switch size="md" onLabel="AVULSO" offLabel="PADRÃO" label="Produto Avulso" checked={isCustomItem} onChange={(event) => setIsCustomItem(event.currentTarget.checked)} />
          </Group>
          {isCustomItem ? (
            <Grid align="flex-end">
              <Grid.Col span={{ base: 12, md: 5 }}>
                <TextInput label="Descrição do Item / Serviço" placeholder="Ex: Instalação, Parafuso Especial..." required value={customName} onChange={(e) => setCustomName(e.currentTarget.value)} />
              </Grid.Col>
              <Grid.Col span={{ base: 6, md: 2 }}>
                <TextInput label="Custo (R$)" placeholder="0,00" value={formatCurrency(Number(customCost))} onChange={(e) => setCustomCost(Number(e.target.value.replace(/\D/g, ''))/100)} />
              </Grid.Col>
              <Grid.Col span={{ base: 6, md: 2 }}>
                <TextInput label="Venda (R$)" placeholder="0,00" required value={formatCurrency(Number(customPrice))} onChange={(e) => setCustomPrice(Number(e.target.value.replace(/\D/g, ''))/100)} />
              </Grid.Col>
              <Grid.Col span={{ base: 6, md: 1 }}>
                <NumberInput label="Qtd" value={quantity} onChange={setQuantity} min={1} allowDecimal={false} />
              </Grid.Col>
              <Grid.Col span={{ base: 6, md: 2 }}>
                <Button fullWidth onClick={handleAddItem} color="orange">Adicionar Item</Button>
              </Grid.Col>
              <Grid.Col span={12}>
                <Text size="xs" c="dimmed" ta="right">Lucro Estimado: {calculateProfitMargin(Number(customCost), Number(customPrice))}%</Text>
              </Grid.Col>
            </Grid>
          ) : (
            <Group align="flex-end">
              <Select label="Produto" placeholder="Busque por nome ou código" data={products.map(p => ({ value: String(p.id), label: `${p.name} (Ref: ${p.sku})` }))} value={selectedProduct} onChange={setSelectedProduct} searchable clearable style={{ flex: 1 }} />
              <NumberInput label="Quantidade" value={quantity} onChange={setQuantity} min={1} allowDecimal={false} style={{ width: 120 }} />
              <Button onClick={handleAddItem}>Adicionar</Button>
            </Group>
          )}
        </Paper>
      )}

      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Produto / Serviço</Table.Th>
            <Table.Th>Qtd.</Table.Th>
            <Table.Th>Preço Unit.</Table.Th>
            <Table.Th>Lucro (%)</Table.Th>
            <Table.Th>Desconto (%)</Table.Th>
            <Table.Th>Total</Table.Th>
            <Table.Th>Ações</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{itemRows && itemRows.length > 0 ? itemRows : 
          <Table.Tr>
            <Table.Td colSpan={7} align="center">Nenhum item adicionado a este orçamento.</Table.Td>
          </Table.Tr> }
        </Table.Tbody>
        <Table.Tfoot>
          <Table.Tr>
            <Table.Td colSpan={5}><Text fw={700}>Total do Orçamento:</Text></Table.Td>
            <Table.Td><Text fw={700} size="lg">{formatCurrency(quote.total_amount)}</Text></Table.Td>
          </Table.Tr>
        </Table.Tfoot>
      </Table>
    </Container>
  );
}

export default QuoteFormPage;
