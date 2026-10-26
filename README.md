# Ecclesio

> Event registration, payments and QR check-in for churches, ministries and communities.

<p>
  <a href="https://ecclesio.com.br/"><img src="frontend/public/logo-horizontal.png" alt="Ecclesio" height="42"></a>
</p>

<p>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=20232A" alt="React 19"></a>
  <a href="https://nestjs.com/"><img src="https://img.shields.io/badge/NestJS-11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS 11"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL 15+"></a>
  <a href="https://www.prisma.io/"><img src="https://img.shields.io/badge/Prisma-7-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma 7"></a>
</p>

## Overview

Ecclesio is a full-stack platform built to simplify the complete event journey for churches and communities: from the public invitation and registration form to online payment, ticket delivery and entrance check-in.

The goal is simple: event teams should spend their time with people, not searching through spreadsheets, payment screenshots and paper lists.

**Live application:** [ecclesio.com.br](https://ecclesio.com.br/)

**Repository:** [github.com/mateusricardodev/Ecclesio](https://github.com/mateusricardodev/Ecclesio)

## Product flow

![Ecclesio event flow](docs/assets/event-flow.svg)

1. **Create the event** — define dates, location, capacity, payment methods and registration fields.
2. **Share the link** — publish a public event page and send it to the community.
3. **Manage registrations** — follow participants, payment status and available capacity from the dashboard.
4. **Check in at the door** — scan each ticket's QR code from a phone or find the participant by name or CPF.

## Product preview

<p align="center">
  <img src="frontend/public/og-image.png" alt="Ecclesio product preview" width="900">
</p>

The interface uses an editorial visual language with a navy, gold and white palette, designed to keep the experience clear for organizers, participants and volunteers.

## Features

### For organizers

- Create and publish events through a four-step wizard.
- Upload event banners and configure public event pages.
- Build custom registration forms with optional fields such as address, emergency contact, responsible person and medication information.
- Set capacity limits and prevent duplicate CPF registrations within the same event.
- Manage registrations, search by name or CPF, edit records and resend confirmation emails.
- Confirm cash payments manually or receive online payment updates automatically.
- Export participant lists for the event team.
- Add volunteers with access restricted to a specific event.
- Send post-event satisfaction surveys.
- Track online-registration revenue in the organizer wallet and request PIX payouts.

### For participants

- Register through a public link without creating an account.
- Pay by PIX through Mercado Pago or follow the event's configured payment instructions.
- Receive confirmation by email.
- Access a ticket with a unique QR code.
- View registrations and payment details from the authenticated participant area.

### For check-in teams

- Scan QR codes with a mobile-friendly interface.
- Search by participant name or CPF when scanning is not available.
- Record attendance and view check-in history and statistics.
- Keep volunteer access scoped to the event they are helping with.

### Authentication and account settings

- JWT-based email and password authentication.
- Google Sign-In using Google Identity Services and server-side ID-token verification.
- Existing accounts are linked by verified email when the user signs in with Google.
- Shadow accounts created during public registration can be claimed through email registration or Google Sign-In without losing event history.
- Account settings for profile name, password creation/change, Google connection status and participant registration history.

## Technical architecture

![Ecclesio architecture](docs/assets/architecture.svg)

The repository is a monorepo containing two independent applications:

```text
Ecclesio/
├── backend/       NestJS REST API, Prisma and PostgreSQL
├── frontend/      React SPA, Vite and Tailwind CSS
└── docs/assets/   README visuals
```

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- React Router 7
- Zustand
- Axios
- QR code scanning with ZXing
- Ticket PDF generation with jsPDF

### Backend

- NestJS 11
- TypeScript
- Prisma 7 with the PostgreSQL adapter
- PostgreSQL 15+
- JWT authentication and Google ID-token verification
- Jest unit and end-to-end tests
- Helmet, CORS and rate limiting
- Upload validation using file magic bytes
- Serializable transactions for capacity, CPF deduplication and wallet operations

### Integrations

- **Mercado Pago** — PIX payments and webhook confirmation.
- **Brevo SMTP** — registration and ticket emails.
- **Google Identity Services** — Google Sign-In.
- **QR Code** — tickets and check-in.

## Local development

### Requirements

- Node.js 22 or later
- PostgreSQL 15 or later
- npm
- A Mercado Pago account for real payment testing (optional)
- A Brevo account for email delivery (optional)
- A Google Cloud OAuth Web Client ID for Google Sign-In (optional during basic local development)

### 1. Clone the repository

```bash
git clone https://github.com/mateusricardodev/Ecclesio.git
cd Ecclesio
```

### 2. Configure the backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/ecclesio"
JWT_SECRET="replace-with-a-long-random-secret"
FRONTEND_URL="http://localhost:5173"
PORT=3000

# Google Cloud → Google Auth Platform → Clients → Web application
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"

# Use mock outside production to test the payment flow locally.
PAYMENT_PROVIDER=mock
MERCADOPAGO_ACCESS_TOKEN=""
MERCADOPAGO_WEBHOOK_SECRET=""

PLATFORM_FEE_PERCENT=5
PLATFORM_FEE_FIXED=0
PLATFORM_FEE_MIN=0
PAYOUT_HOLD_DAYS=7
MIN_PAYOUT_AMOUNT=10

MAIL_HOST="smtp-relay.brevo.com"
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER="your-email@example.com"
MAIL_PASS="your-smtp-key"
MAIL_FROM="Ecclesio <noreply@example.com>"
```

For Google Sign-In, add `http://localhost:5173` and the production frontend origin to the OAuth client's **Authorized JavaScript origins** in Google Cloud. The same client ID is used by the frontend and backend; the OAuth client secret is not used by this ID-token flow and should never be exposed in the frontend.

### 3. Prepare the database

```bash
npx prisma generate
npx prisma migrate dev
npm run seed
```

### 4. Start the backend

```bash
npm run start:dev
```

The API runs at `http://localhost:3000`.

### 5. Configure and start the frontend

In a second terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL="http://localhost:3000"
VITE_GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
```

Then start the app:

```bash
npm run dev
```

The frontend runs at `http://localhost:5173`.

## Payment development mode

The `mock` provider is available outside production so the registration and payment flow can be tested without Mercado Pago:

```env
PAYMENT_PROVIDER=mock
```

After creating a registration, approve a mock payment with:

```bash
curl -X POST http://localhost:3000/payments/mock/<providerPaymentId>/approve
```

Production requires `PAYMENT_PROVIDER=mercadopago` and a valid `MERCADOPAGO_ACCESS_TOKEN`.

## Testing

Run backend unit tests:

```bash
cd backend
npm test
```

Run coverage:

```bash
npm run test:cov
```

Run end-to-end tests:

```bash
npm run test:e2e
```

Build and lint the frontend:

```bash
cd frontend
npm run lint
npm run build
```

## Main routes

### Public

```text
/                         Landing page
/login                    Email/password and Google Sign-In
/privacidade              Privacy policy
/evento/:slug             Public event page
/evento/:slug/inscricao   Public registration form
/evento/:slug/pagamento-pix
```

### Organizer

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
/configuracoes
```

### Check-in

```text
/app/eventos
/app/evento/:id
/app/evento/:id/pesquisar
/app/evento/:id/qrcode
```

### Platform admin

```text
/admin/saques
```

## Security notes

- Passwords are stored as bcrypt hashes.
- Google ID tokens are verified on the backend against the configured OAuth client ID.
- Only verified Google email addresses can be linked to an existing account.
- Event data is authorized by resource ownership.
- Capacity checks and CPF deduplication run inside serializable transactions.
- Canceled registrations are soft-deleted and remain available for auditability.
- Uploads are checked by their actual file signature, not only by the browser-provided MIME type.
- Secrets belong only in environment files and must never be committed.

## Roadmap

- [x] Event creation and publishing
- [x] Custom registration forms
- [x] PIX payment flow
- [x] Payment webhooks
- [x] QR-code tickets
- [x] QR-code check-in
- [x] Organizer dashboard
- [x] Volunteer check-in team
- [x] Organizer wallet and PIX payout requests
- [x] Google Sign-In
- [x] Profile and password settings
- [x] Post-event feedback
- [ ] Password recovery by email
- [ ] Advanced permission roles
- [ ] Automatic refunds
- [ ] Advanced financial reports

## Deployment

The production setup is designed for Ubuntu with:

```text
Nginx → static React build + reverse proxy → PM2-managed NestJS API → PostgreSQL
```

Before deploying a schema change, apply migrations in the backend:

```bash
cd backend
npx prisma migrate deploy
```

For production, build the frontend after setting `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID`; Vite embeds those values during the build.

## Author

**Mateus Ricardo**

Software developer focused on web applications, REST APIs, databases, automation and data analysis.

## License

This project is currently maintained as a personal/product project. All rights reserved unless a license is added to the repository.

