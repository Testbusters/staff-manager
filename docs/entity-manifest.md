# Entity Manifest

> **Phase 1 mandatory lookup**: for any block touching an entity listed here,
> read the linked contract file before running the dependency scan.
> Every surface listed per entity is a mandatory candidate for the file list.
>
> **Three complementary documents — read all relevant ones before Phase 1 STOP:**
> - `docs/dependency-map.md` — code-level surfaces (files, API routes, types)
> - `docs/entity-manifest.md` (this file) — functional surfaces per entity (who, where, which data)
> - `docs/prd/01-rbac-matrix.md` — cross-cutting Role × Entity × Action permissions

---

## Entity Index

| Entity | Tables | Contract | State Machine |
|---|---|---|---|
| [Collaborator Profile](#collaborator-profile) | `collaborators`, `user_profiles` | `docs/profile-editing-contract.md` | member_status only |
| [Compensation](#compensation) | `compensations`, `compensation_competenze` | `docs/contracts/compensation-fields.md` | IN_ATTESA → APPROVATO → LIQUIDATO \| RIFIUTATO |
| [Reimbursement](#reimbursement) | `expense_reimbursements` | `docs/contracts/reimbursement-fields.md` | IN_ATTESA → APPROVATO → LIQUIDATO \| RIFIUTATO |
| [Document](#document) | `documents`, `contract_templates` | `docs/contracts/document-fields.md` | DA_FIRMARE → FIRMATO \| NON_RICHIESTO |
| [Ticket](#ticket) | `tickets` | `docs/contracts/ticket-fields.md` | APERTO → IN_LAVORAZIONE → CHIUSO |
| [Content (5 types)](#content) | `communications`, `events`, `resources`, `opportunities`, `discounts` | `docs/contracts/content-fields.md` | publish / expiry only |
| [Corsi](#corsi) | `corsi`, `lezioni`, `assegnazioni`, `candidature`, `blacklist`, `allegati_globali` | `docs/contracts/corsi-fields.md` | stato: programmato/attivo/concluso (computed) |

---

## Collaborator Profile

**Tables**: `collaborators`, `user_profiles`
**Contract**: `docs/profile-editing-contract.md`

| Role | Create | Read | Edit | Delete |
|---|---|---|---|---|
| `collaboratore` | ❌ (invite-only) | Own only | Own (limited fields) | ❌ |
| `responsabile_compensi` | ❌ | Community members | Community members (no IBAN) | ❌ |
| `amministrazione` | ✅ (invite flow) | All | All fields | ✅ (deactivate) |

**Notification triggers**: E1 (invite), E2 (password reset)
**Key surfaces**: `/profilo`, `/collaboratori/[id]`, `/onboarding`, `/impostazioni/collaboratori`

---

## Compensation

**Tables**: `compensations`, `compensation_competenze`
**Contract**: `docs/contracts/compensation-fields.md`

| Role | Create | Read | Edit | Approve | Reject | Liquidate |
|---|---|---|---|---|---|---|
| `collaboratore` | ❌ | Own only | ❌ | ❌ | ❌ | ❌ |
| `responsabile_compensi` | ✅ | Community members | ❌ (post-create) | ❌ | ✅* (rejection_note required) | ❌ |
| `amministrazione` | ✅ | All | ✅ | ✅ | ✅ | ✅ |

**State machine**: `IN_ATTESA → APPROVATO → LIQUIDATO`, `IN_ATTESA/APPROVATO → RIFIUTATO → IN_ATTESA (reopen)`
**Notification triggers**: creation (E3), approval (E4), rejection (E5), liquidation (E6)
**Key surfaces**: `/coda` (admin), `/compensi` (collab), `/approvazioni` (resp), `/import` (GSheet)
**Notes**: `community_id` always null (since migration 030). `competenza` FK → `compensation_competenze.key`. Massimale check on approve.

---

## Reimbursement

**Tables**: `expense_reimbursements`
**Contract**: `docs/contracts/reimbursement-fields.md`

| Role | Create | Read | Edit | Approve | Liquidate |
|---|---|---|---|---|---|
| `collaboratore` | ✅ (own) | Own only | Own (IN_ATTESA only) | ❌ | ❌ |
| `responsabile_compensi` | ❌ | Community members | ❌ | ❌ | ❌ |
| `amministrazione` | ❌ | All | ✅ | ✅ | ✅ |

**State machine**: identical to Compensation
**Notification triggers**: creation (E3b), approval (E4b), rejection (E5b), liquidation (E6b)
**Key surfaces**: `/coda` (admin), `/rimborsi` (collab), `/approvazioni` (resp)
**Notes**: file attachments stored in `file_urls[]`. Rejection requires `rejection_note`.

---

## Document

**Tables**: `documents`, `contract_templates`
**Contract**: `docs/contracts/document-fields.md`

| Role | Upload | Read | Replace | Delete | Sign |
|---|---|---|---|---|---|
| `collaboratore` | ❌ | Own only | ❌ | ❌ | ✅ (DA_FIRMARE only) |
| `responsabile_compensi` | ❌ | Community members | ❌ | ❌ | ❌ |
| `amministrazione` | ✅ | All | ✅ | ✅ | ❌ (admin can reset stato) |

**State machine**: `DA_FIRMARE → FIRMATO`, `NON_RICHIESTO` (final, no transition)
**Key surfaces**: `/documenti` (collab+admin+resp), `/documenti/[id]` (collab detail)
**Document types**: `CONTRATTO_OCCASIONALE`, `CU`, `RICEVUTA_PAGAMENTO`
**Notes**: generated via `lib/pdf-utils.ts` (pdf-lib) or `docxtemplater`. Storage in private bucket. Signed URLs (1h TTL).

---

## Ticket

**Tables**: `tickets`
**Contract**: `docs/contracts/ticket-fields.md`

| Role | Create | Read | Reply | Close | Assign |
|---|---|---|---|---|---|
| `collaboratore` | ✅ (own) | Own only | ✅ | ❌ | ❌ |
| `responsabile_compensi` | ✅ | Community tickets | ✅ | ✅ | ❌ |
| `amministrazione` | ✅ | All | ✅ | ✅ | ✅ |

**State machine**: `APERTO → IN_LAVORAZIONE → CHIUSO`
**Notification triggers**: new ticket (E7), reply (E9)
**Key surfaces**: `/ticket` (collab), `/ticket` (resp+admin — filtered by community)
**Notes**: `creator_user_id` (not `collaborator_id`) for ownership. `serviceClient` mandatory in API routes.

---

## Content

**Tables**: `communications`, `events`, `resources`, `opportunities`, `discounts`
**Contract**: `docs/contracts/content-fields.md`

| Role | Create | Read | Edit | Delete | Publish |
|---|---|---|---|---|---|
| `collaboratore` | ❌ | Own communities | ❌ | ❌ | ❌ |
| `responsabile_compensi` | ❌ | Assigned communities | ❌ | ❌ | ❌ |
| `amministrazione` | ✅ | All | ✅ | ✅ | ✅ |

**Community targeting**: `community_ids UUID[]` — empty = all communities. In-memory filtering.
**Notification triggers**: E10 (comunicazione), E11 (evento), E12 (contenuto by gender)
**Key surfaces**: `/contenuti` (all roles, filtered by type tab)
**Notes**: Tiptap 3 editor (always `immediatelyRender: false`). Expiry logic on events/discounts/opportunities.

---

## Corsi

**Tables**: `corsi`, `lezioni`, `assegnazioni`, `candidature`, `blacklist`, `allegati_globali`
**Contract**: `docs/contracts/corsi-fields.md`

| Role | Corsi (read) | Corsi (create/edit/delete) | Lezioni (write) | Blacklist | Allegati globali |
|---|---|---|---|---|---|
| `collaboratore` | ✅ (own assignments — corsi-2) | ❌ | ❌ | ❌ | ❌ |
| `responsabile_cittadino` | ✅ (own community — corsi-3) | ❌ | ❌ | ✅ (view) | ✅ (view) |
| `responsabile_compensi` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `amministrazione` | ✅ (all) | ✅ | ✅ | ✅ (full) | ✅ (full) |

**Stato**: computed from `data_inizio`/`data_fine` via `getCorsoStato()` — no physical column.
**Notification triggers**: none in corsi-1 (corsi-4)
**Key surfaces**: `/corsi` (admin list), `/corsi/nuovo` (create), `/corsi/[id]` (detail tabs), `/impostazioni?tab=blacklist`, `/impostazioni?tab=allegati_corsi`
**Notes**: `lezioni.ore` is a GENERATED ALWAYS AS column (computed from orario_inizio/orario_fine). `candidature` requires exactly one of `lezione_id` or `corso_id`. `blacklist` enforces UNIQUE on `collaborator_id`. `allegati_globali` enforces UNIQUE on `(tipo, community_id)` — use UPSERT for updates.
