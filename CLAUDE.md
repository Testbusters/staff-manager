# Staff Manager — Project Context

## Overview
Internal admin portal for managing collaborators across Testbusters and Peer4Med communities.
Handles: personal profiles, compensations, reimbursements, documents, support tickets, content.

## Tech Stack
- **Framework**: Next.js 16 (App Router, TypeScript, `output: 'standalone'`). Auth proxy: `proxy.ts` (NOT `middleware.ts`), exported as `proxy()`.
- **Styling**: Plain Tailwind CSS — NO shadcn/ui, NO component library. Dark mode only.
- **Auth**: Supabase Auth — email/password only. Invite-only, no self-service password reset.
- **Database**: Supabase Postgres, real RLS on every table. Project ID: `nyajqcjqmgxctlqighql`
- **Storage**: Supabase Storage, private buckets, signed URLs (1h TTL via service role).
- **Export**: SheetJS (xlsx) + native CSV.
- **Email**: Resend — fire-and-forget, from `noreply@testbusters.it`. 8 HTML templates (E1–E8) in `lib/email-templates.ts`. `APP_URL` env var controls all CTA links.
- **Deploy**: Replit. Build: `npm install && npm run build && cp -r .next/static .next/standalone/.next/static`. Run: `HOSTNAME=0.0.0.0 node .next/standalone/server.js`

## RBAC Roles
| Role | Access |
|---|---|
| `collaboratore` | Own records only. Self-editable: email, IBAN, phone, address, tshirt, partita_iva, sono_un_figlio_a_carico, avatar. `uscente_senza_compenso`: read-only access to /documenti only. |
| `responsabile_compensi` | Assigned communities. Approve/reject/liquidate compensations and reimbursements (approval is final — no admin double-confirm). Bulk "approve all" IN_ATTESA per community. Read-only access to contenuti (Comunicazioni, Risorse, Eventi, Opportunità, Sconti). |
| `responsabile_cittadino` | *(under definition — access TBD)* |
| `responsabile_servizi_individuali` | *(under definition — access TBD)* |
| `amministrazione` | Full access. Final approval, payments, export, document upload, user/role/settings management. |

Member status: `attivo` | `uscente_con_compenso` (can view ongoing requests, no new docs) | `uscente_senza_compenso` (historical docs only)

## Compensation Workflow
```
IN_ATTESA → APPROVATO → LIQUIDATO
          ↘ RIFIUTATO (rejection_note required)
RIFIUTATO → IN_ATTESA (reopen, collaboratore)
```
- Compensations created by `responsabile_compensi` or `amministrazione` only — always IN_ATTESA (no BOZZA).
- Reimbursements: same flow, created directly as IN_ATTESA by `collaboratore`.
- Approval by responsabile_compensi is final (no admin double-confirm). Admin can also approve/reject/liquidate.

## Document Workflow
Admin uploads PDF → DA_FIRMARE → Collaborator signs → FIRMATO.

## Navigation by Role
| Role | Sidebar items |
|---|---|
| `collaboratore` | Dashboard, Profilo, Compensi, Rimborsi, Documenti, Ticket, Contenuti |
| `responsabile_compensi` | Profilo, Compensi e rimborsi, Collaboratori, Documenti, Ticket, Contenuti |
| `responsabile_cittadino` | *(to be defined)* |
| `responsabile_servizi_individuali` | *(to be defined)* |
| `amministrazione` | Coda lavoro, Collaboratori, Export, Documenti, Ticket, Contenuti, Impostazioni |

## Known Patterns
- **canTransition visibility**: called without `note` → skip requiresNote check (UI visibility only). Note validation only runs when `note !== undefined` (API path). Applies to `reject` action (rejection_note).
- **Invite flow**: `admin.auth.admin.createUser({ email_confirm: true })` + `must_change_password: true`. Always display email+password in the UI as backup in case Resend delivery fails.
- **First login**: proxy checks `must_change_password` → redirect to `/change-password` → `supabase.auth.updateUser` + POST `clear-force-change`.
- **Proxy redirect + cookies**: use `createRedirect(url, supabaseResponse)` which copies Supabase cookies — otherwise the session is lost on redirect.
- **RLS infinite recursion**: `collab_communities_own_read` must NOT make a direct subquery on `collaborators` → use `get_my_collaborator_id()` (security definer).
- **RLS helpers**: `get_my_role()`, `is_active_user()`, `can_manage_community(id)`, `get_my_collaborator_id()` — all `SECURITY DEFINER`.
- **Timeline anonymity**: store `role_label` (not `user_id`) in `compensation_history` / `expense_history`.
- **Playwright form→DB timing**: use `Promise.all([page.waitForResponse(...), async () => { fill; click }()])` before checking DB — without this, DB assertion runs before the API completes, causing false negatives even when DOM already shows the result.
- **Ticket service role**: always use `serviceClient` (service role) for fetch + insert in ticket API routes. Explicit access control in code — do NOT delegate to SSR-side RLS.
- **Supabase SELECT columns**: TypeScript does not validate column names in `.select()`. Non-existent column → silent `fetchError` → 404. Always verify real column names via `information_schema.columns` before using new fields.
- **auth.identities.email**: `auth.identities.email` is a generated column (derived from `identity_data->>'email'`). Direct `UPDATE auth.identities SET email = ...` fails with "cannot assign to generated column". To change a user's email: use `supabase.auth.admin.updateUserById()` or update `auth.users.email` directly.
- **Worktree setup**: three gotchas when using Claude Code worktrees (`EnterWorktree`) on this project: (1) `.env.local` is gitignored — copy manually to the worktree directory. (2) Supabase project is shared — any migration applied inside the worktree hits the live remote DB immediately. (3) `CLAUDE.md` is gitignored — not auto-present in the worktree; copy it if the session needs project instructions.
- **Tooltip pattern**: Tailwind v4 `group/tip` CSS-only tooltip is BROKEN (named groups don't work). Always use `components/ui/InfoTooltip.tsx` (client component, `useState` + `onFocus`/`onBlur` + `tabIndex=0`). Never use CSS-only hover-opacity tooltip pattern.
- **overflow-hidden clips tooltips**: card containers must NOT use `overflow-hidden` — it clips absolutely positioned tooltips even with high z-index. Pattern: remove `overflow-hidden`, add `[&>a:first-child]:rounded-t-xl [&>a:last-child]:rounded-b-xl` for rounded corners on child elements.
- **compensation_competenze table**: admin-configurable lookup table for compensation competenze (corsi/produzione_materiale/sb/extra). NOT a Postgres enum — use `compensation_competenze.key` as FK on `compensations.competenza`. Fetch active rows with `.eq('active', true).order('sort_order')`.
- **GSheet import**: `lib/google-sheets.ts` wraps googleapis (service account from `GOOGLE_SERVICE_ACCOUNT_JSON` env). Column layout A=data_competenza B=importo_lordo C=username D=nome_servizio_ruolo E=info_specifiche F=stato G=competenza. Routes: `POST /api/compensations/import/preview` (validate only) and `/confirm` (stateless re-validate + insert + writeback). Writeback sets stato=PROCESSED in column F. Non-blocking: DB insert success does not depend on writeback.
- **compensations.community_id nullable**: since migration 030, `community_id` is nullable. Compensations from GSheet import and individual form are always created with `community_id = null`. Responsabile RLS uses `collaborator_id` membership (not `can_manage_community`), which works correctly for NULL community_id.

## Coding Conventions
- Product UI language: **Italian**. Code/commits: **English** (conventional commits).
- Status/enum values: `UPPER_SNAKE_CASE`. ZodError: use `.issues` (not `.errors`).
- Every API route: verify caller role before any operation.

## Project Structure
Codebase is self-documenting — use Glob/Read/Grep to explore.
For migration history: see `docs/migrations-log.md`.

## Reference Documents
- **Product spec**: [`docs/requirements.md`](docs/requirements.md) — read the relevant section in Phase 1.
- **Progress tracker**: [`docs/implementation-checklist.md`](docs/implementation-checklist.md) — read before each block, update in Phase 8.
- **Tech debt backlog**: [`docs/refactoring-backlog.md`](docs/refactoring-backlog.md) — check in Phase 1, update in Phase 8.
- **Migration history**: [`docs/migrations-log.md`](docs/migrations-log.md) — update in Phase 2 after every migration.
- **Profile editing contract**: [`docs/profile-editing-contract.md`](docs/profile-editing-contract.md) — **mandatory** for any block touching collaborator profile fields, permissions, or edit flows. Contains field × entry point matrix and validation rules.

## Workflow Requirements
Mandatory development process: see [`.claude/rules/pipeline.md`](.claude/rules/pipeline.md).

## Phase Plan
Full status and block log: [`docs/implementation-checklist.md`](docs/implementation-checklist.md).
