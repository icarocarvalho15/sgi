import { useCallback, useEffect, useState } from 'react';
import { Table, Title, Container, Button, Group, Modal, TextInput, Select, PasswordInput, Pagination, Tooltip, ActionIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { IconPencil, IconTrash, IconPlus } from '@tabler/icons-react';
import api from '../api/axios';
import { notifications } from '@mantine/notifications';
import type { User, Role, SelectOption } from '../types';
import { usePlanLimiter } from '../hooks/usePlanLimiter';

const formatPhone = (phone: string = '') => {
  const cleaned = phone.replace(/\D/g, '').substring(0, 11);
  const length = cleaned.length;
  if (length <= 2) return `(${cleaned}`;
  if (length <= 6) return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2)}`;
  if (length <= 10) return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
};

function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);    
    const [activePage, setActivePage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [roleOptions, setRoleOptions] = useState<SelectOption[]>([]);
    const { canCreate } = usePlanLimiter();
    
    const fetchUsers = useCallback((page: number) => {
        api.get('/users', { params: { page } }).then(response => {
            setUsers(response.data.data);
            setTotalPages(response.data.last_page);
        });
    }, []);

    useEffect(() => {
        fetchUsers(activePage);
        api.get('/roles').then(res => {
            const rolesFromApi: Role[] = res.data;
            const filteredRoles = rolesFromApi.filter(role => role.name !== 'admin');
            setRoleOptions(
                filteredRoles.map(role => ({
                    value: role.name,
                    label: role.display_name
                }))
            );
        });
    }, [activePage, fetchUsers]);

    const form = useForm({
        initialValues: { name: '', email: '', phone: '', password: '', password_confirmation: '', role: '' },
        validate: {
            name: (value) => (value.trim().length < 2 ? 'O nome deve ter pelo menos 2 caracteres' : null),
            email: (value) => (/^\S+@\S+$/.test(value) ? null : 'E-mail inválido'),
            phone: (value) => {
                if (!value) return 'O telefone é obrigatório.';
                if (value && (value.length < 10 || value.length > 11)) {
                    return 'O telefone deve ter entre 10 e 11 dígitos.';
                }
                return null;
            },
            password: (value) => {
                if (!editingUser && value.length < 8) return 'A senha deve ter pelo menos 8 caracteres';
                if (editingUser && value && value.length < 8) return 'A nova senha deve ter pelo menos 8 caracteres';
                return null;
            },
            password_confirmation: (value, values) =>
                value !== values.password ? 'As senhas não conferem' : null,
            role: (value) => (value ? null : 'O cargo/função é obrigatório'),
        },
    });

    const handleOpenCreateModal = () => {
        setEditingUser(null);
        form.reset();
        openModal();
    };

    const handleOpenEditModal = (user: User) => {
        setEditingUser(user);
        form.setValues({
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            password: '', 
            password_confirmation: '',
            role: user.roles[0]?.name || '' 
        });
        openModal();
    };

    const handleSubmit = (values: typeof form.values) => {
        const payload: Partial<typeof form.values> = {
            name: values.name,
            email: values.email,
            phone: values.phone,
            role: values.role,
        };

        if (!editingUser || (editingUser && values.password)) {
            payload.password = values.password;
            payload.password_confirmation = values.password_confirmation;
        }

        const promise = editingUser
            ? api.put(`/users/${editingUser.id}`, payload)
            : api.post('/users', payload);
        
        promise.then(() => {
            closeModal();
            notifications.show({ title: 'Sucesso!', message: `Usuário ${editingUser ? 'atualizado' : 'criado'}.`, color: 'green' });
            fetchUsers(activePage);
        }).catch(error => {
            const message = error.response?.data?.message || `Não foi possível salvar o usuário.`;
            notifications.show({ title: 'Erro!', message, color: 'red' });
        });
    };

    const handleDelete = (id: number) => {
        if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
            api.delete(`/users/${id}`).then(() => {
                notifications.show({ title: 'Sucesso', message: 'Usuário excluído.', color: 'green' });
                fetchUsers(activePage);
            });
        }
    };

    const rows = users.map((userInList) => (
        <Table.Tr key={userInList.id}>
            <Table.Td>{userInList.name}</Table.Td>
            <Table.Td>{userInList.email}</Table.Td>
            <Table.Td>{userInList.phone ? formatPhone(userInList.phone) : 'N/A'}</Table.Td>
            <Table.Td>{userInList.roles[0]?.display_name || 'N/A'}</Table.Td>
            <Table.Td>
                <Group gap="xs">
                    <Tooltip label="Editar Usuário"><ActionIcon variant="light" color="blue" onClick={() => handleOpenEditModal(userInList)}><IconPencil size={16} /></ActionIcon></Tooltip>
                    <Tooltip label="Excluir Usuário"><ActionIcon variant="light" color="red" onClick={() => handleDelete(userInList.id)}><IconTrash size={16} /></ActionIcon></Tooltip>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Container>
            <Modal opened={modalOpened} onClose={closeModal} title={editingUser ? 'Editar Usuário' : 'Adicionar Novo Usuário'}>
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <TextInput label="Nome" placeholder='Insira o nome completo.' required value={form.values.name} onChange={(event) => form.setFieldValue('name', event.currentTarget.value)} error={form.errors.name} />
                    <TextInput label="E-mail" placeholder='Insira um e-mail válido.' type="email" required mt="md" value={form.values.email} onChange={(event) => form.setFieldValue('email', event.currentTarget.value)} error={form.errors.email} />
                    <TextInput label="Telefone" placeholder="(XX) XXXXX-XXXX" mt="md" value={formatPhone(form.values.phone || '')} onChange={(event) => form.setFieldValue('phone', event.currentTarget.value.replace(/\D/g, ''))} error={form.errors.phone} required />
                    <PasswordInput label="Senha" placeholder={editingUser ? 'Deixe em branco para não alterar.' : 'Insira a senha.'} required={!editingUser} mt="md" {...form.getInputProps('password')} />
                    <PasswordInput label="Confirmar Senha" placeholder={editingUser ? 'Deixe em branco para não alterar.' : 'Repita a senha.'} required={!editingUser} mt="md" {...form.getInputProps('password_confirmation')} />
                    <Select label="Cargo/Função" data={roleOptions} required mt="md" {...form.getInputProps('role')} />
                    <Group justify="flex-end" mt="lg">
                        <Button type="submit">Salvar</Button>
                    </Group>
                </form>
            </Modal>
            
            <Group justify="space-between" my="lg">
                <Title order={1}>Gestão de Usuários</Title>
                {canCreate('users') ? (
                    <Button onClick={handleOpenCreateModal} leftSection={<IconPlus size={16} />}>Adicionar Usuário</Button>
                ) : (
                    <Tooltip label="Limite do plano atingido">
                        <Button disabled data-disabled leftSection={<IconPlus size={16} />}>Adicionar Usuário</Button>
                    </Tooltip>
                )}
            </Group>

            <Table>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Nome</Table.Th>
                        <Table.Th>E-mail</Table.Th>
                        <Table.Th>Telefone</Table.Th>
                        <Table.Th>Cargo/Função</Table.Th>
                        <Table.Th>Ações</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {rows.length > 0 ? rows : <Table.Tr><Table.Td colSpan={5} align="center">Nenhum usuário encontrado.</Table.Td></Table.Tr>}
                </Table.Tbody>
            </Table>
            
            <Group justify="center" mt="xl">
                <Pagination total={totalPages} value={activePage} onChange={setActivePage} />
            </Group>
        </Container>
    );
}

export default UsersPage;