import { useCallback, useEffect, useState } from 'react';
import { Table, Title, Container, Button, Modal, Group, Tooltip, Pagination, TextInput } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPencil, IconTrash, IconPlus, IconSearch, IconFileExport } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import type { Customer } from '../types';
import { CustomerForm } from '../components/CustomerForm';
import api from '../api/axios';
import { usePlanLimiter } from '../hooks/usePlanLimiter';

const formatDocument = (doc: string = '') => {
  const cleaned = doc.replace(/\D/g, '');
  if (cleaned.length <= 11) {
    return cleaned.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').substring(0, 14);
  }
  return cleaned.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d)/, '$1-$2').substring(0, 18);
};

const formatPhone = (phone: string = '') => {
  const cleaned = phone.replace(/\D/g, '').substring(0, 11);
  const length = cleaned.length;
  if (length <= 2) return `(${cleaned}`;
  if (length <= 6) return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2)}`;
  if (length <= 10) return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
};

function CustomerPage() {
  const { can } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { canCreate } = usePlanLimiter();
  
  const fetchCustomers = useCallback((page: number, search: string) => {
    api.get('/customers', { params: { page, search } }).then(response => {
      setCustomers(response.data.data);
      setTotalPages(response.data.last_page);
    });
  }, []);
  
  useEffect(() => {
    fetchCustomers(activePage, searchQuery);
  }, [activePage, searchQuery, fetchCustomers]);
  
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setActivePage(1);
      setSearchQuery(searchTerm);
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);
  
  const handleOpenCreateModal = () => {
    setEditingCustomer(null);
    open();
  };
  
  const handleOpenEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    open();
  };
  
  const handleSuccess = () => {
    fetchCustomers(activePage, searchQuery);
    close();
  };
  
  const handleDelete = (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      api.delete(`/customers/${id}`).then(() => {
        fetchCustomers(activePage, searchQuery);
      });
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    api.get('/customers/export', {
      responseType: 'blob',
    }).then(response => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'clientes.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    }).catch(error => {
      console.error("Erro ao exportar clientes:", error);
    }).finally(() => {
      setIsExporting(false);
    });
  };
  
  const rows = customers.map((customer) => (
  <Table.Tr key={customer.id}>
    <Table.Td>{customer.internal_id}</Table.Td>
    <Table.Td>{customer.name}</Table.Td>
    <Table.Td>{customer.document ? formatDocument(customer.document) : 'N/A'}</Table.Td>
    <Table.Td>{customer.email}</Table.Td>
    <Table.Td>{customer.phone ? formatPhone(customer.phone) : 'N/A'}</Table.Td>
    <Table.Td>
      <Group>
        {can('customers.edit') && (<Tooltip label="Editar Cliente"><Button variant="light" color="blue" size="xs" onClick={() => handleOpenEditModal(customer)}><IconPencil size={16} /></Button></Tooltip>)}
        {can('customers.delete') && (<Tooltip label="Excluir Cliente"><Button variant="light" color="red" size="xs" onClick={() => handleDelete(customer.id)}><IconTrash size={16} /></Button></Tooltip>)}
      </Group>
    </Table.Td>
  </Table.Tr>
  ));
  
  return (
  <Container>
    <Modal opened={opened} onClose={close} title={editingCustomer ? 'Editar Cliente' : 'Adicionar Novo Cliente'} size="xl">
      <CustomerForm customer={editingCustomer} onSuccess={handleSuccess} onCancel={close} />
    </Modal>
    <Group justify="space-between" my="lg">
      <Title order={1}>Gestão de Clientes</Title>
      <Group>
        {can('customers.view') && (<Button onClick={handleExport} loading={isExporting} color="green" leftSection={<IconFileExport size={16} />}>Exportar</Button>)}
        {can('customers.create') && (<Button onClick={handleOpenCreateModal} leftSection={<IconPlus size={16} />}>Adicionar Cliente</Button>)}
        {can('customers.create') && (
          canCreate('customers') ? (<Button onClick={handleOpenCreateModal} leftSection={<IconPlus size={16} />}>Novo Cliente</Button>
          ) : (
            <Tooltip label="Limite de clientes atingido. Contate o administrador.">
              <Button disabled data-disabled leftSection={<IconPlus size={16} />}>Novo Cliente</Button>
            </Tooltip>
          )
        )}
      </Group>
    </Group>
    <TextInput label="Buscar Cliente" placeholder="Digite o nome, documento ou e-mail..." value={searchTerm} onChange={(event) => setSearchTerm(event.currentTarget.value)} leftSection={<IconSearch size={16} />} mb="md" />
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>ID</Table.Th>
          <Table.Th>Cliente</Table.Th>
          <Table.Th>Documento</Table.Th>
          <Table.Th>E-mail</Table.Th>
          <Table.Th>Telefone</Table.Th>
          <Table.Th>Ações</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows.length > 0 ? ( rows ) : ( <Table.Tr><Table.Td colSpan={6} align="center">Nenhum cliente encontrado.</Table.Td></Table.Tr> )}</Table.Tbody>
    </Table>
    <Group justify="center" mt="xl">
      <Pagination total={totalPages} value={activePage} onChange={setActivePage} />
    </Group>
  </Container>
  );
}

export default CustomerPage;