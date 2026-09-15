# 🎟️ Ecclesio

> **Plataforma completa para criação, gerenciamento e credenciamento de eventos.**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge\&logo=react)](https://react.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=for-the-badge\&logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge\&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=for-the-badge\&logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=for-the-badge\&logo=prisma)](https://www.prisma.io/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge\&logo=vite)](https://vitejs.dev/)

---

## 🚀 Sobre o projeto

O **Ecclesio** é uma plataforma full-stack desenvolvida para simplificar a criação e gerenciamento de eventos.

A solução permite que organizadores criem eventos, configurem formulários personalizados, definam formas de pagamento e acompanhem inscrições através de um painel administrativo.

Para os participantes, o sistema oferece uma experiência completa de inscrição, pagamento via PIX e recebimento de ingresso com QR Code.

O projeto também possui um módulo específico para **credenciamento**, permitindo realizar check-in através de QR Code ou busca por nome/CPF.

---

## 🎯 Problema

Gerenciar inscrições de eventos manualmente pode gerar:

* Planilhas descentralizadas
* Erros de cadastro
* Dificuldade para acompanhar pagamentos
* Filas no credenciamento
* Falta de informações centralizadas
* Processos manuais demorados

### 💡 Solução

O inscrições.app centraliza todo o fluxo:

```text
Criar evento
     ↓
Configurar formulário
     ↓
Publicar evento
     ↓
Participante se inscreve
     ↓
Pagamento PIX
     ↓
Confirmação
     ↓
Ingresso com QR Code
     ↓
Check-in no evento
```

---

## ✨ Principais funcionalidades

### 👨‍💼 Organizador

* Cadastro e login
* Autenticação via JWT
* Criação de eventos
* Wizard de criação em 4 etapas
* Upload de banners
* Formulários personalizados
* Configuração de pagamentos
* Controle de capacidade
* Dashboard
* Gerenciamento de inscrições
* Busca global
* Inscrição manual
* Cancelamento de inscrições
* Confirmação manual de pagamentos

### 👤 Participante

* Visualização pública do evento
* Inscrição sem necessidade de login
* Formulários personalizados
* Pagamento via PIX
* QR Code PIX
* Código copia-e-cola
* Confirmação automática via webhook
* E-mail de confirmação
* Ingresso em PDF
* QR Code para credenciamento

### 📱 Credenciamento

O sistema possui uma área específica para check-in:

* Leitura de QR Code
* Busca por nome
* Busca por CPF
* Registro de presença
* Histórico de check-ins
* Estatísticas de presença

### 🔐 Segurança

* JWT Authentication
* Autorização por proprietário do recurso
* Rate limiting
* Helmet
* CORS
* Validação de uploads
* Validação por Magic Bytes
* Soft delete para cancelamentos
* Transações com isolamento `Serializable`

---

## 🏗️ Arquitetura

O projeto utiliza uma arquitetura monorepo com duas aplicações independentes:

```text
Ecclesio/
│
├── backend/
│   ├── src/
│   ├── prisma/
│   └── generated/
│
└── frontend/
    ├── src/
    ├── components/
    ├── pages/
    └── ...
```

### Backend

API REST desenvolvida com NestJS.

```text
Frontend
   │
   ▼
REST API
   │
   ▼
NestJS
   │
   ├── Auth
   ├── Events
   ├── Registrations
   ├── Payments
   ├── Check-in
   └── Tickets
   │
   ▼
Prisma ORM
   │
   ▼
PostgreSQL
```

---

## 🛠️ Stack tecnológica

### Frontend

| Tecnologia     | Função           |
| -------------- | ---------------- |
| React 19       | Interface        |
| Vite           | Build/dev server |
| TypeScript     | Tipagem          |
| Tailwind CSS 4 | UI               |
| Zustand        | Estado global    |
| React Router 7 | Roteamento       |

### Backend

| Tecnologia   | Função         |
| ------------ | -------------- |
| NestJS 11    | API            |
| TypeScript   | Linguagem      |
| Prisma 7     | ORM            |
| PostgreSQL   | Banco de dados |
| Passport JWT | Autenticação   |
| Jest         | Testes         |

### Integrações

| Tecnologia   | Função                |
| ------------ | --------------------- |
| Mercado Pago | Pagamentos PIX        |
| Brevo SMTP   | E-mails               |
| Multer       | Upload de arquivos    |
| file-type    | Validação de arquivos |
| QR Code      | Ingressos e check-in  |

### Infraestrutura

```text
Ubuntu
  │
  ├── Nginx
  │
  ├── PM2
  │
  ├── NestJS API
  │
  └── React Build
```

---

## 🗃️ Modelo de dados

Principais entidades:

```text
User
 │
 ├── Event
 │    ├── EventPaymentMethod
 │    ├── Registration
 │    │     └── Payment ──┐
 │    ├── Ticket          │
 │    └── CheckinLog      │
 │                        │
 ├── LedgerEntry ◄────────┘
 ├── PayoutRequest
 └── EventVolunteer
```

O sistema utiliza PostgreSQL como banco de dados e Prisma como camada de acesso.

### Carteira do organizador

Pagamentos online caem na conta da plataforma. O que pertence ao organizador é
registrado como crédito em `LedgerEntry` e resgatado via `PayoutRequest`:

- `Payment.amount` é o total cobrado; `baseAmount` é a parte do organizador e
  `feeAmount` a taxa de serviço que fica com a plataforma.
- **O saldo nunca é uma coluna** — é sempre a soma de `LedgerEntry`. Uma linha
  entra no saldo sacável quando `availableAt <= agora`; vendas ficam retidas até
  `PAYOUT_HOLD_DAYS` depois do fim do evento, que é a proteção contra estornar
  um PIX já resgatado.
- O crédito nasce no `confirmPayment` do webhook, dentro da mesma transação que
  marca o pagamento como pago. O índice único de `LedgerEntry.paymentId` é a
  garantia de que um webhook repetido não credita duas vezes.
- Pagamento em dinheiro e confirmação manual **não** geram crédito: o valor foi
  direto para o organizador e nunca passou pela plataforma.
- Pedir um resgate debita o razão na mesma transação serializável que confere o
  saldo. Recusar gera uma linha de estorno, em vez de apagar o débito.
- O repasse em si é manual na v1: o admin envia o PIX e marca como pago em
  `/admin/saques`.

---

## ⚡ Como executar

### Pré-requisitos

* Node.js 20+
* PostgreSQL 15+
* npm
* Conta Mercado Pago — opcional
* Conta Brevo — opcional

---

### 1. Clone o projeto

```bash
git clone https://github.com/mateusricardodev/Ecclesio.git
cd Ecclesio
```

---

### 2. Configure o Backend

```bash
cd backend
npm install
```

Crie um arquivo `.env`:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/inscricoes"

JWT_SECRET="sua-chave-secreta"
FRONTEND_URL="http://localhost:5173"
PORT=3000

PAYMENT_PROVIDER=mock

MERCADOPAGO_ACCESS_TOKEN=""
MERCADOPAGO_WEBHOOK_SECRET=""

# Taxa de serviço da plataforma, cobrada POR CIMA do valor da inscrição
# (inscrição de R$ 100 + 5% = participante paga R$ 105 e o organizador
# recebe R$ 100). Um evento pode sobrescrever via Event.feePercent/feeFixed.
PLATFORM_FEE_PERCENT=5
PLATFORM_FEE_FIXED=0
PLATFORM_FEE_MIN=0

# Carteira: dias de retenção do saldo contados a partir do fim do evento,
# e valor mínimo de um pedido de resgate.
PAYOUT_HOLD_DAYS=7
MIN_PAYOUT_AMOUNT=10

MAIL_HOST="smtp-relay.brevo.com"
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER="seu@email.com"
MAIL_PASS="sua-chave"
MAIL_FROM="inscrições.app <noreply@inscricoes.app>"
```

---

### 3. Configure o banco

```bash
npx prisma generate
npx prisma migrate dev
npm run seed
```

---

### 4. Inicie o backend

```bash
npm run start:dev
```

API:

```text
http://localhost:3000
```

---

### 5. Inicie o frontend

Em outro terminal:

```bash
cd frontend
npm install
```

Crie o `.env`:

```env
VITE_API_URL="http://localhost:3000"
```

Execute:

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## 💳 Desenvolvimento com PIX

O projeto possui um provider `mock` para desenvolvimento, permitindo testar o fluxo de pagamento sem utilizar o Mercado Pago.

```env
PAYMENT_PROVIDER=mock
```

Após realizar uma inscrição, o pagamento pode ser aprovado através da API de desenvolvimento.

```bash
curl -X POST http://localhost:3000/payments/mock/<providerPaymentId>/approve
```

---

## 🧪 Testes

### Unitários

```bash
cd backend

npm test
```

### Cobertura

```bash
npm run test:cov
```

### E2E

```bash
npm run test:e2e
```

---

## 🗺️ Principais rotas

### Público

```text
/
 /login
 /evento/:slug
 /evento/:slug/inscricao
 /evento/:slug/pagamento-pix
```

### Organizador

```text
/dashboard
/eventos
/events/new
/events/:id
/events/:id/edit
/events/:id/registrations/new
/events/:id/equipe
/buscar-inscricoes
/financeiro
```

### Admin da plataforma

```text
/admin/saques
```

### Credenciamento

```text
/app/eventos
/app/evento/:id
/app/evento/:id/pesquisar
/app/evento/:id/qrcode
```

---

## 📈 Roadmap

* [x] Autenticação
* [x] Criação de eventos
* [x] Formulários personalizados
* [x] Inscrições
* [x] Pagamento PIX
* [x] Webhook de pagamento
* [x] Ingressos com QR Code
* [x] Check-in
* [x] Dashboard
* [x] Upload de banners
* [x] E-mail de confirmação
* [ ] Exportação de relatórios
* [ ] Recuperação de senha
* [ ] Sistema avançado de permissões
* [ ] Reembolso automático
* [ ] Relatórios financeiros avançados

---

## 🌐 Deploy

O projeto foi estruturado para execução em ambiente Linux utilizando:

```text
Nginx + PM2 + Ubuntu
```

O frontend pode ser servido como build estático, enquanto o backend roda como processo gerenciado pelo PM2.

---

## 📌 Status

🟢 **Projeto funcional / Full Stack**

O projeto representa uma aplicação completa de gerenciamento de eventos, desde a criação do evento até o credenciamento do participante.

---

## 👨‍💻 Autor

**Mateus Ricardo**

Desenvolvedor de Software com experiência em aplicações web, APIs REST, bancos de dados, automação e análise de dados.

---

⭐ Gostou do projeto? Deixe uma estrela no repositório!
