# Staff Manager

Internal admin portal for managing collaborators across the Testbusters and Peer4Med communities: profiles, compensation approvals, reimbursements, document signing, support tickets, and content publishing. Invite-only, role-based auth via Supabase (email/password).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, `output: standalone`) |
| Styling | Tailwind v4 + shadcn/ui (Radix primitives) |
| Auth | Supabase Auth — email/password, invite-only, forced password change on first login |
| Database | Supabase Postgres with Row Level Security on every table |
| Storage | Supabase Storage (private buckets, signed URLs, 1h TTL) |
| Email | Resend — transactional, fire-and-forget, `noreply@testbusters.it` |
| PDF | pdf-lib (fill markers, sign) + pdfjs-dist v5 (text extraction) |
| Rich text | Tiptap 3 |
| Charts | Recharts |
| Export | ExcelJS + native CSV |
| Testing | Vitest (unit/API tests) + Playwright (e2e, currently suspended) |

---

## Architecture

```
app/
  (app)/          Protected routes — guarded by proxy.ts (auth + onboarding check)
    page.tsx      Role-aware dashboard (collaboratore / responsabile / amministrazione)
    coda/         Admin approval queue (compensations + reimbursements full lifecycle)
    collaboratori/ Collaborator directory + detail (responsabile + admin)
    compensi/     Compensation list + detail (collaboratore)
    rimborsi/     Reimbursement creation + detail (collaboratore)
    approvazioni/ Approval queue + bulk import form (responsabile + admin)
    documenti/    Document list + sign flow + CU batch upload (admin; redirect for others)
    import/       Bulk import — Collaboratori / Contratti / CU (admin only)
    export/       GSheet export + XLSX download + run history (admin only)
    contenuti/    Content hub — 5 tabs: comunicazioni, sconti, risorse, eventi, opportunità
    ticket/       Support ticket list, creation, thread + reply
    notifiche/    Full in-app notification history
    impostazioni/ Admin settings — users, communities, collaborators, templates, monitoring
    profilo/      Self-service profile editor (all roles)
  api/            Next.js route handlers — all routes verify auth + role before any operation
  login/          Public login page (always dark theme)
  change-password/ Forced password change (proxy redirect on must_change_password)
  onboarding/     Standalone wizard (proxy redirect on onboarding_completed = false)

components/       UI components grouped by feature area
  ui/             shadcn/ui primitives (Button, Input, Dialog, Sheet, Badge, Table, …)
  admin/          Coda, AdminDashboard, BlocksDrawer, MassimaleCheckModal
  compensation/   CompensationList, ActionPanel, Timeline, ApprovazioniCompensazioni, …
  expense/        ExpenseList, ExpenseActionPanel, ApprovazioniRimborsi, …
  documents/      DocumentList, DocumentSignFlow, DocumentUploadForm, CUBatchUpload
  import/         ImportCollaboratoriSection, ImportContrattiSection, ImportCUSection
  export/         ExportSection, ExportPreviewTable, ExportHistoryTab
  contenuti/      CommunicationList, EventList, DiscountList, OpportunityList, ResourceList
  ticket/         TicketList, TicketThread, TicketForm, TicketStatusBadge, …
  impostazioni/   CreateUserForm, CommunityManager, MonitoraggioSection, …
  onboarding/     OnboardingWizard (2-step: anagrafica + contract generation)
  Sidebar.tsx     Role-based navigation + theme toggle + NotificationBell
  FeedbackButton.tsx  Floating feedback widget (all app pages)

lib/
  supabase/       client.ts (browser) + server.ts (SSR) + service.ts (service role)
  types.ts        Role/status enums, DB row interfaces
  nav.ts          NAV_BY_ROLE config — iconName: string (serializable across Server→Client)
  compensation-transitions.ts  Pure state machine (4 actions)
  expense-transitions.ts       Pure state machine (7 actions incl. reject_manager)
  pdf-utils.ts    findMarkerPositions (pdfjs-dist) + fillPdfMarkers (pdf-lib)
  document-generation.ts       buildContractVars + buildReceiptVars + generateDocument
  email.ts        Resend wrapper (fire-and-forget)
  email-templates.ts           12 branded HTML templates (E1–E12)
  email-template-service.ts    DB-backed template renderer with {{marker}} substitution
  google-sheets.ts             Google Sheets API wrapper (import + export)
  google-drive.ts              Drive helper — buildFolderMap + downloadFile (retry on 429)
  import-sheet.ts              GSheet helper for Collaboratori import (A–I layout)
  cu-import-sheet.ts           GSheet helper for CU import
  contratti-import-sheet.ts    GSheet helper for Contratti import
  export-utils.ts              groupToCollaboratorRows, toGSheetRow, buildHistoryXLSXWorkbook
  notification-utils.ts        Notification payload builders (8 entity types)
  notification-helpers.ts      DB helpers — getResponsabiliFor*, getAllActiveCollaboratori
  massimale.ts    getYtd() + isOverMassimale() — server-side ceiling check on approval
  password.ts     generatePassword() — shared across invite + admin reset flows

proxy.ts          Auth middleware: active check → must_change_password → onboarding → app
supabase/migrations/  077 migrations applied in sequence (see docs/migrations-log.md)
lib/schemas/      15 shared Zod schemas (form + API validation)
__tests__/        521 Vitest tests (unit + API schema validation)
e2e/              Playwright specs + shared helpers (6 RHF migration scenarios)
docs/             Product specs, implementation checklist, migration log, sitemap
```

### Key architectural patterns

- **Auth proxy** (`proxy.ts`): exported as `proxy()`, NOT `middleware.ts`. Handles redirect chain: `must_change_password → /change-password → onboarding_completed=false → /onboarding → app`. Uses `createRedirect(url, supabaseResponse)` to copy Supabase cookies on redirect.
- **RLS helpers**: `get_my_role()`, `is_active_user()`, `can_manage_community(id)`, `get_my_collaborator_id()` — all `SECURITY DEFINER`. Never query `collaborators` directly inside RLS policies (infinite recursion risk).
- **Service role**: storage uploads, ticket API routes, and all admin mutations use `serviceClient` explicitly — RLS is NOT relied on for those paths.
- **State machines**: compensation and expense transitions are pure functions in `lib/*-transitions.ts`. The API routes call them server-side; components call them for UI visibility only.
- **Notifications**: `notification_settings` table (19 rows: event_key × recipient_role). Fire-and-forget with `.catch(() => {})` — never block API responses on notification delivery.
- **Theme**: `next-themes` (`defaultTheme="dark"`, `enableSystem=false`). Stored in `user_profiles.theme_preference`, synced by `ThemeSync` client component. Login page always forces dark.

---

## RBAC & Roles

| Role | Description |
|---|---|
| `collaboratore` | Own records only. Self-editable: email, IBAN, phone, address, tshirt, partita_iva, sono_un_figlio_a_carico, avatar. `uscente_senza_compenso`: read-only `/documenti`. |
| `responsabile_compensi` | Assigned communities. Create compensations (individual + bulk). View reimbursements. Read-only access to all content. Cannot approve/reject/liquidate. |
| `responsabile_cittadino` | *(under definition — access TBD)* |
| `responsabile_servizi_individuali` | *(under definition — access TBD)* |
| `amministrazione` | Full access: approval queue, payments, exports, document upload, user/role/settings management. |

Member status lifecycle: `attivo` → `uscente_con_compenso` (ongoing requests, no new docs) → `uscente_senza_compenso` (historical docs only).

---

## State Machines

### Compensation

```
IN_ATTESA → APPROVATO → LIQUIDATO
          ↘ RIFIUTATO (rejection_note required)
RIFIUTATO → IN_ATTESA  (reopen — collaboratore only)
```

| Action | From | To | Authorized roles |
|---|---|---|---|
| `reopen` | RIFIUTATO | IN_ATTESA | collaboratore |
| `approve` | IN_ATTESA | APPROVATO | responsabile_compensi, amministrazione |
| `reject` | IN_ATTESA | RIFIUTATO | responsabile_compensi, amministrazione |
| `mark_liquidated` | APPROVATO | LIQUIDATO | amministrazione |

Compensations are always created as `IN_ATTESA` (no BOZZA). Approval by `responsabile_compensi` is final — no admin double-confirm required.

### Reimbursement

```
IN_ATTESA → APPROVATO → LIQUIDATO
          ↘ RIFIUTATO
RIFIUTATO → IN_ATTESA  (reopen — collaboratore only)
```

Same approval flow as compensations. `responsabile_compensi` can view but NOT approve/reject/liquidate.

### Document

```
DA_FIRMARE → FIRMATO
```

Admin uploads PDF → collaborator downloads, signs, uploads back → admin confirms `FIRMATO`. `NON_RICHIESTO` is used for documents that do not require a signature (e.g. CU, RICEVUTA_PAGAMENTO).

---

## Getting Started

### Prerequisites

- Node.js 20+
- A Supabase project (get `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- A Resend account for transactional email

### Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd staff-manager
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Fill in all required variables (see Environment Variables below)

# 3. Apply database migrations
# Open Supabase SQL Editor and run supabase/migrations/*.sql in order (001 → 045)
# Or use the Supabase CLI: supabase db push

# 4. Start development server
npm run dev        # http://localhost:3000
```

### First login

Create an admin user directly in Supabase Auth (Dashboard → Authentication → Users), then set their role to `amministrazione` in the `user_profiles` table. All subsequent users are invited through the app's Settings → Users panel.

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | ✅ |
| `SUPABASE_ACCESS_TOKEN` | Supabase Personal Access Token (Management API) | ✅ |
| `RESEND_API_KEY` | Transactional email API key | ✅ |
| `RESEND_WEBHOOK_SECRET` | Webhook signing secret (Resend → `/api/webhooks/resend`) | ✅ |
| `APP_URL` | Production URL, e.g. `https://staff.testbusters.it` — used in all email CTAs | ✅ |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google service account JSON (Sheets + Drive API) | ✅ |
| `GOOGLE_SHEET_ID` | Spreadsheet ID for compensation import | ✅ |
| `GOOGLE_SHEET_TAB_NAME` | Tab name for compensation import | ✅ |
| `GOOGLE_SHEET_EXPORT_ID` | Spreadsheet ID for export writeback | ✅ |
| `IMPORT_COLLABORATORI_SHEET_ID` | Spreadsheet ID for collaborator import | ✅ |
| `NEXT_PUBLIC_IMPORT_COLLABORATORI_SHEET_ID` | Same — public (used in UI links) | ✅ |
| `CONTRATTI_SHEET_ID` | Spreadsheet ID for contract import | ✅ |
| `NEXT_PUBLIC_CONTRATTI_SHEET_ID` | Same — public | ✅ |
| `CONTRATTI_DRIVE_FOLDER_ID` | Google Drive folder ID containing signed contracts | ✅ |
| `NEXT_PUBLIC_CONTRATTI_DRIVE_FOLDER_ID` | Same — public | ✅ |
| `CU_SHEET_ID` | Spreadsheet ID for CU import | ✅ |
| `CU_SHEET_TAB` | Tab name for CU import | ✅ |
| `CU_DRIVE_FOLDER_ID` | Google Drive folder ID containing CU files | ✅ |
| `NEXT_PUBLIC_CU_SHEET_ID` | Same — public | ✅ |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID (Calendar/Maps embeds) | optional |

Copy `.env.local.example` as a starting point. Never commit `.env.local` — it is gitignored.

---

## Testing

```bash
# Unit + API schema tests (Vitest)
npx vitest run              # all 521 tests
npx vitest run __tests__/api/  # API schema tests only

# Type check
npx tsc --noEmit

# Production build
npm run build

# Playwright e2e (currently suspended — see .claude/CLAUDE.local.md)
npx playwright test
```

Test files in `__tests__/`:
- `compensation-transitions.test.ts` — state machine unit tests
- `expense-transitions.test.ts` — reimbursement state machine
- `export-utils.test.ts` — GSheet export aggregation
- `notification-utils.test.ts` — notification payload builders
- `api/` — Zod schema validation for all API routes

E2e specs in `e2e/` cover: dashboard (all 3 roles), compensation/reimbursement flows, document signing, tickets, notifications, content hub, onboarding, import flows, admin settings.

---

## Deployment

Deployed on **Vercel**. Preview: `staff-staging.peerpetual.it` (staging branch). Production: `staff.peerpetual.it` (main branch).

```bash
# Standalone build (used in non-Vercel environments)
npm install && npm run build && cp -r .next/static .next/standalone/.next/static

# Run standalone
HOSTNAME=0.0.0.0 node .next/standalone/server.js
```

The `output: standalone` config in `next.config.ts` is retained for portability.

---

## Feature Status

See [`docs/implementation-checklist.md`](docs/implementation-checklist.md) for the full log of implemented blocks, test results, and next planned work.

Current status (as of 2026-04-04):
- ✅ Auth + onboarding wizard + forced password change
- ✅ Compensation + reimbursement workflows (full state machine)
- ✅ Document upload, signing flow, CU batch import
- ✅ Bulk import — Collaboratori / Contratti / CU (via Google Sheets + Drive)
- ✅ GSheet export + XLSX download
- ✅ Support ticket system (thread, reply, notifications)
- ✅ Content hub (communications, events, discounts, opportunities, resources)
- ✅ In-app + email notification system (19 configurable event/role pairs)
- ✅ PDF generation (contracts + payment receipts) with digital signature
- ✅ Email template management (12 templates, DB-backed, admin-editable)
- ✅ Admin monitoring dashboard (auth log, import/export runs, email delivery, DB stats)
- ✅ shadcn/ui component system (Tailwind v4, dark/light themes)

---

## Contributing

This project follows a structured development pipeline described in [`.claude/rules/pipeline.md`](.claude/rules/pipeline.md).

**Commit conventions**: [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.

**Branch strategy**: feature branches from `main`, squash-merge on completion. Worktrees used for parallel development blocks.

**Code language**: product UI labels in Italian; all code, commits, and internal docs in English.

**Before submitting a change**:
1. `npx tsc --noEmit` — zero TypeScript errors
2. `npm run build` — successful production build
3. `npx vitest run` — all tests green
4. For new UI: verify both light and dark themes (sidebar toggle)
