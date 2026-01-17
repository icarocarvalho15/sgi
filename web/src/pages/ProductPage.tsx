import { useEffect, useState, useCallback } from 'react';
import { Table, Title, Container, Button, Modal, TextInput, Textarea, Group, Tooltip, Pagination, Grid, Image, FileInput, Select, ActionIcon, Badge, Tabs, NumberInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { IconPencil, IconTrash, IconPlus, IconSearch, IconUpload, IconCategory, IconCategoryPlus, IconFileExport, IconReceipt } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import type { Product, Category, SelectOption, ProductFormData, ProductComponent } from '../types';
import { usePlanLimiter } from '../hooks/usePlanLimiter';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

function ProductCompositionManager({ product }: { product: Product }) {
    const [components, setComponents] = useState<ProductComponent[]>([]);
    const [productOptions, setProductOptions] = useState<SelectOption[]>([]);
    const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
    const [quantityUsed, setQuantityUsed] = useState<number | string>(1);

    useEffect(() => {
        api.get(`/products/${product.id}/components`).then(res => setComponents(res.data));
    }, [product.id]);

    useEffect(() => {
        api.get('/products', { params: { per_page: 1000, type: 'produto' } }).then(res => {
            setProductOptions(res.data.data.map((p: Product) => ({
                value: String(p.id),
                label: `${p.name} (Cód: ${p.internal_id})`,
            })));
        });
    }, []);

    const handleAddComponent = () => {
        if (!selectedComponent || !quantityUsed) return;
        api.post(`/products/${product.id}/components`, {
            component_id: selectedComponent,
            quantity_used: quantityUsed,
        }).then(res => {
            setComponents(current => [...current, res.data]);
            setSelectedComponent(null);
            setQuantityUsed(1);
        });
    };

    const handleRemoveComponent = (componentId: number) => {
        api.delete(`/product-components/${componentId}`).then(() => {
            setComponents(current => current.filter(c => c.id !== componentId));
        });
    };

    return (
        <>
            <Table>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Ingrediente (Matéria-Prima)</Table.Th>
                        <Table.Th>Qtd. Usada</Table.Th>
                        <Table.Th>Ação</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {components.map(comp => (
                        <Table.Tr key={comp.id}>
                            <Table.Td>{comp.component.name}</Table.Td>
                            <Table.Td>{Number(comp.quantity_used)}</Table.Td>
                            <Table.Td><ActionIcon color="red" onClick={() => handleRemoveComponent(comp.id)}><IconTrash size={16} /></ActionIcon></Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
            <Group mt="xl" grow>
                <Select data={productOptions} placeholder="Buscar matéria-prima..." value={selectedComponent} onChange={setSelectedComponent} searchable />
                <NumberInput value={quantityUsed} onChange={setQuantityUsed} min={0.001} decimalScale={4} />
                <Button onClick={handleAddComponent} leftSection={<IconPlus size={16} />}>Adicionar</Button>
            </Group>
        </>
    );
}

function ProductPage() {
    const { can } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [productModalOpened, { open: openProductModal, close: closeProductModal }] = useDisclosure(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState<Partial<ProductFormData>>({});
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [activePage, setActivePage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
    const [categoryModalOpened, { open: openCategoryModal, close: closeCategoryModal }] = useDisclosure(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const { canCreate } = usePlanLimiter();

    const categoryForm = useForm({
        initialValues: { name: '', description: '' },
        validate: { name: (value) => (value.trim().length < 2 ? 'O nome da categoria é obrigatório.' : null) },
    });

    const fetchProducts = useCallback((page: number, search: string) => {
        api.get('/products', { params: { page, search } }).then(response => {
            setProducts(response.data.data);
            setTotalPages(response.data.last_page);
        }).catch(error => {
            console.error('Houve um erro ao buscar os produtos!', error);
        });
    }, []);

    const fetchCategories = useCallback(() => {
        api.get('/categories').then(res => {
            setCategories(res.data);
            setCategoryOptions(res.data.map((c: Category) => ({ value: String(c.id), label: c.name })));
        }).catch(() => notifications.show({ title: 'Erro', message: 'Não foi possível carregar as categorias.', color: 'red' }));
    }, []);

    useEffect(() => {
        fetchProducts(activePage, searchQuery);
    }, [activePage, searchQuery, fetchProducts]);
    
    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            setActivePage(1);
            setSearchQuery(searchTerm);
        }, 500);
        return () => clearTimeout(debounceTimer);
    }, [searchTerm]);

    const handleOpenCreateModal = () => {
        setEditingProduct(null);
        setFormData({ name: '', sku: '', type: 'produto', description: '', sale_price: 0, category_id: null });
        setImageFile(null);
        openProductModal();
    };

    const handleOpenEditModal = (product: Product) => {
        setEditingProduct(product);
        setFormData({ name: product.name, sku: product.sku, type: product.type, description: product.description || '', sale_price: product.sale_price, category_id: product.category_id });
        setImageFile(null);
        openProductModal();
    };

    const handleFormSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        const data = new FormData();
        data.append('name', formData.name || '');
        data.append('sku', formData.sku || '');
        data.append('type', formData.type || '');
        data.append('sale_price', String(formData.sale_price || 0));

        if (formData.description) {
            data.append('description', formData.description);
        }

        if (formData.category_id) {
            data.append('category_id', String(formData.category_id));
        }

        if (imageFile) {
            data.append('image', imageFile);
        }

        const promise = editingProduct
        ? api.post(`/products/${editingProduct.id}`, data, { params: { _method: 'PUT' } })
        : api.post('/products', data);
        
        promise.then(() => {
            closeProductModal();
            fetchProducts(activePage, searchQuery);
            notifications.show({ title: 'Sucesso!', message: `Produto ${editingProduct ? 'atualizado' : 'criado'}.`, color: 'green' });
        }).catch(error => {
            const message = error.response?.data?.message || 'Não foi possível salvar o produto.';
            notifications.show({ title: 'Erro!', message: message, color: 'red' });
        });
    };
    
    const handleDelete = (id: number) => {
        if (window.confirm('Tem certeza que deseja excluir este produto?')) {
            api.delete(`/products/${id}`).then(() => {
                notifications.show({ title: 'Sucesso', message: `Produto #${id} foi excluído.`, color: 'green' });
                fetchProducts(activePage, searchQuery);
            }).catch(() => {
                notifications.show({ title: 'Erro', message: `Houve um erro ao excluir o produto ${id}!`, color: 'red' });
            });
        }
    };

    const handleOpenCreateCategoryModal = () => {
        setEditingCategory(null);
        categoryForm.reset();
        openCategoryModal();
    };

    const handleOpenEditCategoryModal = (category: Category) => {
        setEditingCategory(category);
        categoryForm.setValues({
            name: category.name, description: category.description || ''
        });
        openCategoryModal();
    };

    const handleCategorySubmit = (values: typeof categoryForm.values) => {
        const promise = editingCategory ? api.put(`/categories/${editingCategory.id}`, values) : api.post('/categories', values);
        promise.then(() => {
            closeCategoryModal();
            notifications.show({ title: 'Sucesso!', message: `Categoria ${editingCategory ? 'atualizada' : 'criada'}.`, color: 'green' });
            fetchCategories();
        }).catch(error => {
            const message = error.response?.data?.message || 'Não foi possível salvar a categoria.';
            notifications.show({ title: 'Erro!', message, color: 'red' });
        });
    };

    const handleCategoryDelete = (id: number) => {
        if (window.confirm('Tem certeza? Os produtos nesta categoria ficarão sem categoria.')) {
            api.delete(`/categories/${id}`).then(() => {
                notifications.show({ title: 'Sucesso', message: 'Categoria excluída.', color: 'green' });
                fetchCategories();
            });
        }
    };

    const handleExport = () => {
        setIsExporting(true);
        api.get('/products/export', { responseType: 'blob' })
            .then(response => {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'produtos.csv');
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
                window.URL.revokeObjectURL(url);
            })
            .catch(error => console.error("Erro ao exportar produtos:", error))
            .finally(() => setIsExporting(false));
    };

    const rows = products.map((product) => (
        <Table.Tr key={product.id}>
            <Table.Td>{product.internal_id}</Table.Td>
            <Table.Td>{product.name}</Table.Td>
            <Table.Td>{product.sku}</Table.Td>
            <Table.Td><Badge color={product.type === 'servico' ? 'grape' : 'blue'}>{product.type === 'servico' ? 'Serviço' : 'Produto'}</Badge></Table.Td>
            <Table.Td>{product.category?.name || 'N/A'}</Table.Td>
            <Table.Td>{formatCurrency(product.sale_price)}</Table.Td>
            <Table.Td>{product.type === 'produto' ? product.quantity_in_stock : 'N/A'}</Table.Td>
            <Table.Td>
                <Group gap="xs">
                    {can('products.edit') && (<Tooltip label="Editar Produto"><ActionIcon variant="light" color="blue" onClick={() => handleOpenEditModal(product)}><IconPencil size={16} /></ActionIcon></Tooltip>)}
                    {can('products.delete') && (<Tooltip label="Excluir Produto"><ActionIcon variant="light" color="red" onClick={() => handleDelete(product.id)}><IconTrash size={16} /></ActionIcon></Tooltip>)}
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    const categoryRows = categories.map((category) => (
        <Table.Tr key={category.id}>
            <Table.Td>{category.name}</Table.Td>
            <Table.Td>{category.products_count}</Table.Td>
            <Table.Td>
                <Group gap="xs">
                    {can('categories.manage') && (<Tooltip label="Editar Categoria"><ActionIcon variant="light" color="blue" onClick={() => handleOpenEditCategoryModal(category)}><IconPencil size={16} /></ActionIcon></Tooltip>)}
                    {can('categories.manage') && (<Tooltip label="Excluir Categoria"><ActionIcon variant="light" color="red" onClick={() => handleCategoryDelete(category.id)}><IconTrash size={16} /></ActionIcon></Tooltip>)}
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Container>
            <Modal opened={productModalOpened} onClose={closeProductModal} title={editingProduct ? `Editar: ${editingProduct.name}` : 'Novo Item'} size="lg">
                <Tabs defaultValue="details">
                    <Tabs.List>
                        <Tabs.Tab value="details">Detalhes do Item</Tabs.Tab>
                        {editingProduct && formData.type === 'servico' && (
                            <Tabs.Tab value="composition" leftSection={<IconReceipt size={14} />}>Composição</Tabs.Tab>
                        )}
                    </Tabs.List>

                    <Tabs.Panel value="details" pt="xs">
                        <form onSubmit={handleFormSubmit}>
                            <Grid>
                                <Grid.Col span={{ base: 12, md: 7 }}>
                                    <Select label="Tipo de Item" value={formData.type} onChange={(value) => setFormData(p => ({ ...p, type: value as 'produto' | 'servico' }))} data={[ { value: 'produto', label: 'Produto Físico (controla estoque)' }, { value: 'servico', label: 'Serviço (não controla estoque)' }, ]} required />
                                    <TextInput label="Nome do Produto" value={formData.name || ''} onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} required mt="md" />
                                    <TextInput label="Código (SKU)" value={formData.sku || ''} onChange={(e) => setFormData(p => ({...p, sku: e.target.value}))} required mt="md" />
                                    <TextInput label="Preço de Venda" placeholder="R$ 0,00" value={formatCurrency(formData.sale_price || 0)} onChange={(e) => setFormData(p => ({...p, sale_price: Number(e.target.value.replace(/\D/g, '')) / 100}))} mt="md" />
                                    <Select label="Categoria" placeholder="Selecione uma categoria" data={categoryOptions} value={String(formData.category_id || '')} onChange={(value) => setFormData(p => ({ ...p, category_id: value ? Number(value) : null }))} clearable mt="md" />
                                    <Textarea label="Descrição (Opcional)" value={formData.description || ''} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} mt="md" autosize minRows={2} />
                                </Grid.Col>
                                <Grid.Col span={{ base: 12, md: 5 }}>
                                    <Title order={5} mb="xs">Imagem do Produto</Title>
                                    {editingProduct?.image_path && !imageFile && ( <Image radius="md" h={150} w="auto" fit="contain" src={`${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}/storage/${editingProduct.image_path}`} /> )}
                                    {imageFile && ( <Image radius="md" h={150} w="auto" fit="contain" src={URL.createObjectURL(imageFile)} /> )}
                                    <FileInput mt="md" label="Escolher nova imagem" placeholder="Selecione um arquivo" leftSection={<IconUpload size={14} />} value={imageFile} onChange={setImageFile} accept="image/png,image/jpeg" clearable />
                                </Grid.Col>
                            </Grid>
                            <Group justify="flex-end" mt="lg">
                                <Button type="submit">Salvar</Button>
                            </Group>
                        </form>
                    </Tabs.Panel>

                    <Tabs.Panel value="composition" pt="xs">
                        {editingProduct && <ProductCompositionManager product={editingProduct} />}
                    </Tabs.Panel>
                </Tabs>
            </Modal>
            
            <Modal opened={categoryModalOpened} onClose={closeCategoryModal} title={editingCategory ? 'Editar Categoria' : 'Categorias'}>
                <Table>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Nome</Table.Th>
                            <Table.Th>Produtos</Table.Th>
                            <Table.Th>Ações</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{categoryRows}</Table.Tbody>
                </Table>
                <form onSubmit={categoryForm.onSubmit(handleCategorySubmit)}>
                    <Group mt="md" grow>
                        <TextInput placeholder="Nova categoria..." required {...categoryForm.getInputProps('name')} />
                        <Button type="submit" leftSection={<IconCategoryPlus size={16}/>}>Adicionar</Button>
                    </Group>
                </form>
            </Modal>

            <Group justify="space-between" my="lg">
                <Title order={1}>Gestão de Produtos</Title>
                <Group>
                    {can('products.view') && (<Button onClick={handleExport} loading={isExporting} color="green" leftSection={<IconFileExport size={16} />}>Exportar</Button>)}
                    {can('categories.manage') && (<Button variant="default" onClick={handleOpenCreateCategoryModal} leftSection={<IconCategory size={16} />}>Gerenciar Categorias</Button>)}
                    {can('products.create') && (<Button onClick={handleOpenCreateModal} leftSection={<IconPlus size={16} />}>Adicionar Novo Item</Button>)}
                    {can('products.create') && (
                        canCreate('products') ? (<Button onClick={handleOpenCreateModal} leftSection={<IconPlus size={16} />}>Adicionar Novo Item</Button>
                        ) : (
                        <Tooltip label="Limite de produtos do plano atingido. Faça upgrade para continuar." withArrow>
                            <Button disabled data-disabled leftSection={<IconPlus size={16} />}>Adicionar Novo Item</Button>
                        </Tooltip>
                        )
                    )}
                </Group>
            </Group>

            <TextInput label="Buscar Produto" placeholder="Digite o nome, código ou categoria..." value={searchTerm} onChange={(event) => setSearchTerm(event.currentTarget.value)} leftSection={<IconSearch size={16} />} mb="md" />
            
            <Table>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>ID</Table.Th>
                        <Table.Th>Produto</Table.Th>
                        <Table.Th>Código</Table.Th>
                        <Table.Th>Tipo</Table.Th>
                        <Table.Th>Categoria</Table.Th>
                        <Table.Th>Preço de Venda</Table.Th>
                        <Table.Th>Estoque</Table.Th>
                        <Table.Th>Ações</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {rows.length > 0 ? ( rows ) : ( 
                        <Table.Tr>
                            <Table.Td colSpan={8} align="center">Nenhum produto encontrado.</Table.Td>
                        </Table.Tr>
                    )}
                </Table.Tbody>
            </Table>
            
            <Group justify="center" mt="xl">
                <Pagination total={totalPages} value={activePage} onChange={setActivePage} />
            </Group>
        </Container>
    );
}

export default ProductPage;