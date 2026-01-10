import { useState } from 'react';
import { Grid, TextInput, Select, Loader, Button, Group, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import type { Customer, CustomerFormData, CustomerFormProps } from '../types';
import axios from 'axios';
import api from '../api/axios';

const formatDocument = (doc: string = '', type: 'fisica' | 'juridica' = 'fisica') => {
    const cleaned = doc.replace(/\D/g, '');
    if (type === 'fisica') {
        return cleaned.substring(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2');
    }
    return cleaned.substring(0, 14).replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
};

const formatPhone = (phone: string = '') => {
    const cleaned = phone.replace(/\D/g, '').substring(0, 11);
    if (!cleaned) return '';
    const length = cleaned.length;
    if (length <= 2) return `(${cleaned}`;
    if (length <= 6) return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2)}`;
    if (length <= 10) return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
};

export function CustomerForm({ customer, onSuccess, onCancel }: CustomerFormProps) {
    const initialFormData: CustomerFormData = {
        type: customer?.type || 'fisica',
        document: customer?.document || '',
        name: customer?.name || '',
        legal_name: customer?.legal_name || null,
        email: customer?.email || '',
        phone: customer?.phone || '',
        address: customer?.addresses?.[0] || { cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' },
    };
    
    const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
    const [isCepLoading, setIsCepLoading] = useState(false);
    const [isCnpjLoading, setIsCnpjLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const _dummyCustomer: Customer | null = null;
    if (false) console.log(_dummyCustomer);

    const handleCepBlur = (event: React.FocusEvent<HTMLInputElement>) => {
        const cep = event.target.value.replace(/\D/g, '');
        if (cep.length !== 8) return;

        setIsCepLoading(true);
        axios.get(`https://brasilapi.com.br/api/cep/v1/${cep}`)
            .then(response => {
                const { street, neighborhood, city, state } = response.data;
                setFormData(prev => ({ ...prev, address: { ...prev.address, street, neighborhood, city, state } }));
            })
            .catch(() => notifications.show({ title: 'Aviso', message: 'CEP não encontrado.', color: 'yellow' }))
            .finally(() => setIsCepLoading(false));
    };

    const handleDocumentBlur = (event: React.FocusEvent<HTMLInputElement>) => {
        if (formData.type !== 'juridica') return;
        const cnpj = event.target.value.replace(/\D/g, '');
        if (cnpj.length !== 14) return;

        setIsCnpjLoading(true);
        axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
            .then(response => {
                const { nome_fantasia, razao_social, ddd_telefone_1, email, cep, logradouro, numero, bairro, municipio, uf, complemento } = response.data;
                setFormData(prev => ({
                    ...prev,
                    name: nome_fantasia || prev.name,
                    legal_name: razao_social || prev.legal_name,
                    phone: ddd_telefone_1?.replace(/\D/g, '') || prev.phone,
                    email: email || prev.email,
                    address: {
                        ...prev.address,
                        cep: cep?.replace(/\D/g, '') || prev.address.cep,
                        street: logradouro || prev.address.street,
                        number: numero || prev.address.number,
                        complement: complemento || prev.address.complement,
                        neighborhood: bairro || prev.address.neighborhood,
                        city: municipio || prev.address.city,
                        state: uf || prev.address.state,
                    }
                }));
            })
            .catch(() => notifications.show({ title: 'Aviso', message: 'CNPJ não encontrado.', color: 'yellow' }))
            .finally(() => setIsCnpjLoading(false));
    };

    const handleFormSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        setIsSaving(true);
        const promise = customer
            ? api.put(`/customers/${customer.id}`, formData)
            : api.post('/customers', formData);
        
        promise.then(response => {
            notifications.show({ title: 'Sucesso!', message: `Cliente ${customer ? 'atualizado' : 'cadastrado'}.`, color: 'green' });
            onSuccess(response.data);
        }).catch(error => {
            if (error.response?.status === 422) {
                const errorMessages = Object.values(error.response.data.errors).flat().join('\n');
                notifications.show({ title: 'Erro de Validação', message: errorMessages, color: 'red' });
            } else {
                notifications.show({ title: 'Erro!', message: 'Não foi possível salvar o cliente.', color: 'red' });
            }
        }).finally(() => setIsSaving(false));
    };

    return (
        <form onSubmit={handleFormSubmit}>
            <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Select label="Tipo de Cliente" value={formData.type} onChange={(value) => setFormData(p => ({ ...p, type: value as 'fisica' | 'juridica', document: '' }))} data={[{ value: 'fisica', label: 'Pessoa Física' }, { value: 'juridica', label: 'Pessoa Jurídica' }]} required />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput label={formData.type === 'fisica' ? 'CPF' : 'CNPJ'} value={formatDocument(formData.document, formData.type)} onChange={(e) => setFormData(p => ({ ...p, document: e.target.value.replace(/\D/g, '') }))} onBlur={handleDocumentBlur} rightSection={isCnpjLoading ? <Loader size="xs" /> : null} />
                </Grid.Col>
                <Grid.Col span={12}>
                    <TextInput label={formData.type === 'fisica' ? 'Nome Completo' : 'Nome Fantasia'} value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} required />
                </Grid.Col>
                {formData.type === 'juridica' && (
                    <Grid.Col span={12}>
                        <TextInput label="Razão Social" value={formData.legal_name || ''} onChange={(e) => setFormData(p => ({ ...p, legal_name: e.target.value }))} required />
                    </Grid.Col>
                )}
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput label="E-mail" type="email" value={formData.email || ''} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput label="Telefone" placeholder="(XX) XXXXX-XXXX" value={formatPhone(formData.phone || '')} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))} maxLength={15} required />
                </Grid.Col>
                
                <Grid.Col span={12}><Title order={5} mt="md">Endereço Principal</Title></Grid.Col>
                
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <TextInput label="CEP" value={formData.address.cep} onChange={(e) => setFormData(p => ({...p, address: {...p.address, cep: e.target.value.replace(/\D/g, '')}}))} onBlur={handleCepBlur} rightSection={isCepLoading ? <Loader size="xs" /> : null} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 8 }}>
                    <TextInput label="Rua / Logradouro" value={formData.address.street} onChange={(e) => setFormData(p => ({...p, address: {...p.address, street: e.target.value}}))} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <TextInput label="Número" value={formData.address.number} onChange={(e) => setFormData(p => ({...p, address: {...p.address, number: e.target.value}}))} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 8 }}>
                    <TextInput label="Complemento/Referência" value={formData.address.complement || ''} onChange={(e) => setFormData(p => ({...p, address: {...p.address, complement: e.target.value}}))} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 5 }}>
                    <TextInput label="Bairro" value={formData.address.neighborhood} onChange={(e) => setFormData(p => ({...p, address: {...p.address, neighborhood: e.target.value}}))} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 5 }}>
                    <TextInput label="Cidade" value={formData.address.city} onChange={(e) => setFormData(p => ({...p, address: {...p.address, city: e.target.value}}))} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 2 }}>
                    <TextInput label="UF" value={formData.address.state} onChange={(e) => setFormData(p => ({...p, address: {...p.address, state: e.target.value}}))} />
                </Grid.Col>
            </Grid>
            <Group justify="flex-end" mt="lg">
                <Button variant="default" onClick={onCancel}>Cancelar</Button>
                <Button type="submit" loading={isSaving}>Salvar</Button>
            </Group>
        </form>
    );
}