# Reimbursement Fields Contract

> **Mandatory reference for any block touching reimbursement (expense) data.**
> Every block that modifies reimbursement schema, field permissions, or state transitions
> must verify alignment across all entry points and update this document accordingly.

---

## Entry Points

| Entry point | Route / Component | Auth | Notes |
|---|---|---|---|
| **Create** | `POST /api/expenses` | `collaboratore` (self) | Always creates IN_ATTESA |
| **Edit** | `PATCH /api/expenses/[id]` | `collaboratore` (own, IN_ATTESA only) | Cannot edit after submitted |
| **Status transition** | `PATCH /api/expenses/[id]` (action param) | `amministrazione` | approve / reject / liquidate / reopen |
| **File upload** | `POST /api/expenses/[id]/attachments` | `collaboratore` (own, IN_ATTESA only) | FormData upload. Server-side storage via service role. Max 10 MB, PDF/JPG/PNG. Filename sanitized. Storage path: `{collaboratorId}/{expenseId}/{filename}`. |
| **Detail (SSR)** | `app/(app)/rimborsi/[id]/page.tsx` | all roles | Attachments enriched with batch signed URLs (1h TTL) |
| **Detail (API)** | `GET /api/expenses/[id]` | all roles | Returns `{ reimbursement, attachments, history }`. Attachments include signed URLs. |

---

## Field Permission Matrix

| Campo | Collaboratore Create | Collaboratore Edit | Admin Transition | Notes |
|---|---|---|---|---|
| `collaborator_id` | ✅ (auto: own) | ❌ immutable | ❌ immutable | Derived from session |
| `descrizione` | ✅ required | ✅ | ❌ | Free text description |
| `importo` | ✅ required | ✅ | ❌ | Positive numeric. DB CHECK > 0 since migration 070. |
| `data_spesa` | ✅ required | ✅ | ❌ | ISO date, not in the future |
| `community_id` | ✅ (auto: from collaborator_communities) | ❌ immutable | ❌ immutable | Derived from collaborator's community |
| attachments | ✅ (via upload route, IN_ATTESA only) | ✅ (via upload route, IN_ATTESA only) | ❌ | Stored in `expense_attachments` table + `expenses` private bucket |
| `stato` | — (auto IN_ATTESA) | ❌ | ✅ (via action) | Changed only via transitions |
| `rejection_note` | — | — | ✅ (on reject) | Required when `action=reject` |

---

## State Transition Permissions

| Transition | From | To | Role | Notes |
|---|---|---|---|---|
| approve | IN_ATTESA | APPROVATO | `amministrazione` | No massimale check (reimbursements excluded) |
| reject | IN_ATTESA, APPROVATO | RIFIUTATO | `amministrazione` | `rejection_note` required |
| liquidate | APPROVATO | LIQUIDATO | `amministrazione` | Triggers receipt generation |
| reopen | RIFIUTATO | IN_ATTESA | `collaboratore` | Via dedicated UI button |

---

## Validation Rules

| Campo | Rule |
|---|---|
| `importo` | Positive number (Zod `.positive()` + DB CHECK > 0), max 2 decimal places |
| `data_spesa` | Valid ISO date, not in the future |
| attachments | Upload: max 10 MB per file, MIME `application/pdf`, `image/jpeg`, `image/png`. Filename sanitized (`[^a-zA-Z0-9._-]` → `_`). At least 1 required by business rule (enforced in UI, not API). |
| `rejection_note` | Required string when `action=reject` |

---

## Dependency Check Protocol

Before starting any block that touches reimbursement data:

1. **Schema change** (new column): update this matrix + create and edit API routes
2. **State machine change**: update `lib/transitions.ts` + transition API route + UI action buttons
3. **File handling change**: update both file upload/delete routes + UI file list component
4. **Permission change**: update this matrix + API auth checks + Coda lavoro UI

---

## Known Constraints

- Ownership is `collaborator_id` (not `user_id`) — filter via `collaborator_id IN (SELECT id FROM collaborators WHERE user_id = auth.uid())`.
- `responsabile_compensi` can VIEW but NOT create, edit, approve, reject, or liquidate reimbursements.
- File storage: use service role client in API routes — never browser client for Supabase Storage.
- API response key is `{ reimbursement }` (not `{ expense }`) — verify before reading in modal fetch.
- `GET /api/expenses/[id]` returns `{ reimbursement }`. Do not assume `{ expense }`.
- **DB-level integrity (migration 070)**: `importo` has `CHECK (importo > 0)` — any service-role insert with zero or negative amount is blocked at the DB level.
