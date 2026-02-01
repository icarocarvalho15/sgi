# SGI Drav Dev - Plataforma SaaS Multi-Tenant (v0.1.8)

![Badge Status](https://img.shields.io/badge/Status-Em_Desenvolvimento-yellow) ![Badge Version](https://img.shields.io/badge/Versão-1.8-blue) ![Badge Tech](https://img.shields.io/badge/Stack-Laravel_%2B_React-red)

**Um ERP/CRM de Manufatura e Serviços projetado para escalar.**

Desenvolvido pela **Drav Dev**, este sistema não é apenas um gerenciador de empresas; é uma plataforma **SaaS (Software as a Service) Multi-Tenant** completa. Ele permite que múltiplas empresas (tenants) operem dentro da mesma infraestrutura com isolamento total de dados, segurança robusta e fluxos de trabalho personalizados para o setor gráfico e de manufatura sob encomenda.

---

## 🚀 Destaques da Arquitetura (O "Motor" do SaaS)

O diferencial deste projeto reside nas soluções de arquitetura de software implementadas para garantir escalabilidade e isolamento:

### 1. 🏛️ Arquitetura Multi-Tenant "Shared Database"
- **Isolamento Lógico (The Wall):** Implementação de `Global Scopes` automáticos em todos os Models. O sistema aplica filtros de segurança (`WHERE tenant_id = X`) em 100% das consultas, garantindo que os dados de uma empresa sejam invisíveis para outras.
- **Segurança de Fábrica:** Policies e Gates garantem que usuários só acessem recursos do seu próprio tenant.

### 2. 🕵️‍♂️ Auditoria e Rastreabilidade (Novo na v0.1.8)
- **Logs de Atividades Granulares:** Integração profunda com *Events* e *Listeners* para monitorar alterações críticas.
- **Inteligência de Contexto:** O sistema distingue entre uma edição manual ("Usuário alterou estoque") e uma automação de sistema ("Baixa automática por Conclusão de Produção"), exibindo etiquetas visuais distintas para fácil leitura.
- **Blindagem de Dados:** Tratamento de *race conditions* para evitar duplicidade de logs em operações automáticas.

### 3. 🔢 IDs Sequenciais por Tenant
- Diferente de sistemas tradicionais que expõem IDs globais do banco de dados (ex: Orçamento #4592), o SGI implementa uma lógica de **numeração sequencial isolada**.
- A Empresa A tem o **"Orçamento Nº 1"**. A Empresa B também tem o seu **"Orçamento Nº 1"**.

### 4. 🧪 Engenharia de Produto (Bill of Materials)
- Suporte para produtos do tipo **"Serviço"** com **Composição (Receita)**.
- O sistema permite definir que 1 unidade do serviço "Impressão A3" consome X unidades da matéria-prima "Papel A3" e Y unidades de "Tinta".

### 5. 🤖 Automação de Estoque Inteligente
- **Baixa na Conclusão:** A dedução de estoque ocorre no momento exato da conclusão da Ordem de Produção (`production_finished`), garantindo que o custo só seja contabilizado quando o produto está pronto.
- **Histórico (Kardex):** Registro imutável de todas as movimentações (Entradas, Vendas, Perdas e Produção).

---

## ✨ Funcionalidades do SGI (O Produto)

### 📊 Dashboard & Analytics
- Interface moderna com **Modo Escuro (Dark Mode)** automático.
- Gráficos de funil de vendas, status de produção e faturamento.

### 🛡️ Módulo de Auditoria (Segurança)
- Timeline visual estilo "banco" para acompanhar quem fez o quê.
- Tradução de campos técnicos (`sale_price`) para linguagem humana ("Preço de Venda").
- Visualização de "Antes e Depois" para alterações de valores.

### 📝 Orçamentos (CRM) & Kanban
- **Gestão Visual (Kanban):** Quadro interativo com *Drag & Drop*.
- Geração de **PDFs Profissionais** instantâneos com a marca da empresa cliente.
- Envio direto para WhatsApp.

### 🏭 Produção & Chão de Fábrica
- Transformação automática de Orçamentos aprovados em **Ordens de Produção**.
- Controle de status (Pendente -> Em Produção -> Concluído).
- Geração de **Ordem de Serviço** (interna) e **Protocolo de Entrega** (cliente).

---

## 📸 Galeria do Sistema

*Uma visão geral da interface limpa e funcional do SGI.*

### O "Painel de Deus" (Filament Super Admin)
*Gerenciamento global da plataforma pela Drav Dev.*
![Painel Admin](docs/images/0.png)
![Gerenciamento de Planos](docs/images/0b.png)

### Dashboard Operacional (Modo Escuro)
*Visão geral para o cliente final.*
![Dashboard Dark](docs/images/1.png)

### Módulo de Orçamentos
*Criação e edição com IDs sequenciais.*
![Lista de Orçamentos](docs/images/2.png)
![Edição de Orçamento](docs/images/3.png)

### Kanban de Orçamentos
*Visualização dos orçamentos usando a metodologia japonesa.*
![Visualização em Kanban](docs/images/4.png)

### Controle de Produção
*Listagem de ordens com identificação clara dos itens.*
![Lista de Produção](docs/images/14.png)

### Engenharia de Produto
*Definição da composição (receita) de um serviço.*
![Criação de Produtos](docs/images/5.png)
![Composição de Produto](docs/images/6.png)

### Gerenciamento de Estoque
*Controle de entrada e saída de produtos do estoque.*
![Movimentação de Estoque](docs/images/7.png)

### Histórico de Estoque (Kardex)
*Transparência total na movimentação de materiais.*
![Kardex](docs/images/13.png)

### Produção e PDFs
*Controle de produção e documentos gerados.*
![Lista de Produção](docs/images/8.png)
![PDF Ordem de Serviço](docs/images/9.png)

### Relatórios Financeiros
![Fluxo de Caixa](docs/images/10.png)
![Controle de Pagamentos](docs/images/11.png)

### Auditoria e Logs (Destaque v0.1.8)
*Rastreabilidade completa com distinção visual de eventos automáticos.*
![Auditoria Detalhada](docs/images/12.png)

---

## 🔮 Roadmap de Futuras Melhorias (Plataforma v0.2.0)

Com a fundação Multi-Tenant (v0.1.8) concluída, o roadmap se concentra em escalar o produto:

- **Testes Automatizados (A Rede de Segurança):**
  - Expandir a cobertura de testes (com Pest) para todos os módulos, garantindo a estabilidade da plataforma para todos os tenants a cada nova atualização.

- **Refinamentos de Fluxo:**
  - Implementar a funcionalidade de "Reverter Cancelamento" para Admins, com a lógica de estorno de estoque/financeiro.

- **Módulo Fiscal/Financeiro Avançado (v0.3.0):**
  - Integração com APIs de terceiros (ex: Asaas, PlugNotas) para emissão de **NFe/NFSe** e geração de **Boletos Registrados**.

---

## 💻 Stack Tecnológica

O projeto utiliza uma stack moderna e robusta, focada em performance e manutenibilidade.

**Backend (API RESTful)**
- **Framework:** Laravel 11 (PHP 8.3)
- **Admin Panel:** Filament 3
- **Auditoria:** Spatie Activity Log
- **Auth:** Laravel Sanctum
- **PDFs:** DomPDF
- **Banco de Dados:** MySQL 8

**Frontend (SPA)**
- **Framework:** React 18 (Vite)
- **Linguagem:** TypeScript
- **UI Kit:** Mantine UI v7
- **HTTP Client:** Axios

- **Ambiente:**
  - WSL + Docker (Windows 10 IoT Enterprise LTSC 21H2)
  - Git & GitHub (Versionamento)

---

## 🚀 Como Rodar o Projeto Localmente

### Pré-requisitos
- PHP 8.3+
- Composer
- Node.js & NPM
- MySQL

1.  **Clonar o Repositório:**
    ```bash
    git clone https://github.com/icarocarvalho15/sgi.git
    cd sgi
    ```

2.  **Configurar o Backend (API):**
    ```bash
    cd api
    composer install
    cp .env.example .env
    php artisan key:generate

    # Configure seu banco de dados no .env e então:
    php artisan migrate:fresh --seed
    php artisan storage:link
    php artisan serve
    ```

3.  **Configurar o Frontend (Web):**
    ```bash
    cd web
    npm install    
    cp .env.example .env
    # Ou crie o arquivo .env com: VITE_API_BASE_URL=http://localhost:8000/api
    npm run dev
    ```

4.  **Acessar e Testar:**
    * Painel Super Admin: `http://localhost:8000/admin` (Login: `admin@dravdev.com`)
    * O frontend estará disponível em `http://localhost:5173` (ou outra porta).
    * Use os usuários de teste (ex: `admin@empresa1.com`, `admin@empresa2.com`) com a senha `password`.

---

## 🍰 Sobre a Drav Dev

Este projeto foi desenvolvido com dedicação pela **Drav Dev** como parte do nosso portfólio de soluções de software customizadas. Ele demonstra nossa capacidade de construir aplicações full-stack complexas, seguras e com foco na experiência do usuário.

*v0.1.8 - Release "Audit Logs"*