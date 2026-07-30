# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend (Next.js 14, port 3003)
cd frontend
npm run dev       # Development server
npm run build     # Production build
npm run start     # Production server
npm run lint      # ESLint

# Backend (Express 5, port 5003)
cd backend
npm run dev       # Start with node
npm run start     # Same as dev

# Database (Prisma)
cd backend
npx prisma generate    # Regenerate client after schema changes
npx prisma db push     # Push schema to DB (dev)
npx prisma studio      # Prisma Studio GUI
npx prisma migrate dev # Create + apply migration
```

## Architecture

### Monorepo structure
```
axon-ecosystem/
├── frontend/          # Next.js 14 App Router, React 18, Tailwind 4, TypeScript
│   └── src/
│       ├── app/           # Next.js App Router pages
│       │   ├── dashboard/ # Protected routes (auth required via middleware)
│       │   │   ├── sales/        # Quotations, Sales Orders, Proposals, Projects, Surveys
│       │   │   ├── purchasing/   # Purchase Orders, Vendor Bills
│       │   │   ├── inventory/    # Stock, Warehouses, Transfers, Opname
│       │   │   ├── operations/   # Work Orders, Delivery Orders, BAST, Reports
│       │   │   ├── finance/      # COA, Invoices, Expenses, Reports, Banks
│       │   │   ├── hr/           # Employees, Payroll, Attendance, Location Tracking
│       │   │   ├── contracts/    # Contracts/SPK
│       │   │   ├── management/   # Customers, Products, Assets, Business Categories
│       │   │   ├── settings/     # Company, Users, Network
│       │   │   ├── maintenance/  # Daily maintenance runs
│       │   │   ├── operational/  # MikroTik infrastructure
│       │   │   └── page.tsx      # Dashboard home
│       │   ├── login/page.tsx
│       │   ├── invoice-print/page.tsx
│       │   ├── api/auth/[...nextauth]/route.ts
│       │   └── layout.tsx
│       ├── components/    # Shared components
│       │   ├── ui/            # button, card, badge, progress (shadcn-style)
│       │   ├── landing/       # Marketing/landing page components
│       │   ├── sales/         # ProjectDetailModal, ProjectPDF
│       │   ├── purchasing/    # VendorBill modals
│       │   ├── dashboard/     # MikroTikStats
│       │   ├── invoice/       # InvoiceTemplate for PDF/print
│       │   ├── Sidebar.tsx    # Main navigation sidebar
│       │   ├── ClientLayout.tsx
│       │   ├── MobileNav.tsx
│       │   ├── Providers.tsx  # Session, QueryClient, Language, PWA providers
│       │   └── PWAInstallPrompt.tsx
│       ├── store/uiStore.ts   # Zustand store (sidebar, mobile menu, PWA)
│       ├── context/LanguageContext.tsx  # ID/EN bilingual support
│       ├── hooks/usePWA.ts, useLocationTracker.ts
│       ├── lib/auth.ts        # NextAuth config (CredentialsProvider, JWT)
│       ├── lib/utils.ts       # cn() utility (clsx + tailwind-merge)
│       ├── types/next-auth.d.ts
│       └── middleware.ts      # Protects /dashboard/* routes
├── backend/           # Express 5, CommonJS, PostgreSQL via Prisma
│   ├── index.js            # ~7200 lines — ALL routes in one file
│   ├── prisma/
│   │   └── schema.prisma   # Full DB schema (~80+ models)
│   └── utils/
│       ├── encryption.js   # AES-256-GCM for MikroTik passwords
│       ├── mikrotik.js      # RouterOS API client (node-routeros)
│       └── accountingUtils.js  # Auto journal posting helpers
└── tools/             # Utility scripts
```

### Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS 4, Framer Motion
- **Backend**: Express 5, Prisma 6 (PostgreSQL), node-routeros (MikroTik API)
- **Auth**: NextAuth.js v4 (CredentialsProvider, JWT strategy, role-based)
- **State**: Zustand (UI state), TanStack React Query (server state)
- **Forms**: react-hook-form + zod validation
- **Charts**: Chart.js (react-chartjs-2) with datalabels plugin
- **PDF**: jsPDF + jspdf-autotable
- **Maps**: Leaflet / react-leaflet
- **PWA**: @ducanh2912/next-pwa (service worker)

### Auth & RBAC
- NextAuth with CredentialsProvider — login hits `POST /api/login` on backend
- JWT stores `role` and `department` from DB user record
- Backend RBAC via `checkRole()` middleware reading `x-user-role`, `x-user-dept`, `x-user-name` headers (passed by Nginx or proxy)
- Roles: SUPER_ADMIN > ADMIN > MANAGER > STAFF > OPERATIONAL > USER
- Frontend middleware protects `/dashboard/*` — redirects to `/login`

### Business Data Flow
1. **Sales Pipeline**: Customer → Quotation → Sales Order → Project → Field Survey → Proposal
2. **Operations**: Sales Order / Asset → Work Order → Delivery Order → BAST → Invoice
3. **Purchasing**: Vendor → Purchase Request → Purchase Order → Purchase Receive → Purchase Invoice
4. **Inventory**: Warehouse → Stock Movements (IN/OUT/TRANSFER) → WarehouseStock
5. **Finance**: ChartOfAccounts → JournalEntry/JournalItem → Reports (Trial Balance, P&L, Balance Sheet, Cash Flow, Cash Flow Forecast)
6. **Contracts**: Auto-billing via cron (daily 00:01) — generates invoices from contract terms
7. **Infrastructure**: MikroTik device management with encrypted credentials, live monitoring/traffic polling

### Key Patterns
- **Backend**: Express routes defined inline in `index.js` — no route/controller separation. Prisma transactions used for multi-table writes. Sequential auto-number generators for documents (QUO-YYYY-NNN, SO-YYYY-NNN, etc.)
- **Frontend Pages**: Usually single `page.tsx` per route with inline CRUD modals. Axios calls directly from components. `useSession()` from next-auth for current user. Language translations defined as const objects in each component (not extracted to files).
- **UI**: Sidebar-driven navigation with collapsible sections. Bilingual (ID/EN) via LanguageContext. Dark mode via next-themes. Mobile-responsive with hamburger menu.
- **Image Upload**: multer (memoryStorage) → sharp (convert to WebP) → save to `/backend/public/` subdirectories
- **PDF Generation**: jsPDF templates for quotations, sales orders, work orders, delivery orders, BAST, invoices, purchase orders

### No tests — commands `Error: no test specified`
