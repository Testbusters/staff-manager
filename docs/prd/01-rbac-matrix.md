# RBAC Matrix — Role × Entity × Action

> **Phase 1 mandatory lookup**: for any block touching role permissions, RBAC rules,
> or adding a new entity surface, verify alignment against this matrix before declaring the file list.
> Update this document in Phase 8 (step 2e) whenever a block changes role permissions.
>
> `responsabile_cittadino` fully defined (corsi-1/2/3). `responsabile_servizi_individuali` — not yet in scope.

---

## Legend

| Symbol | Meaning |
|---|---|
| ✅ | Allowed, no restrictions |
| ✅* | Allowed with conditions (see Notes) |
| ❌ | Not allowed |
| — | Not applicable to this role |

---

## 1. Collaborator Profile

| Action | `collaboratore` | `responsabile_compensi` | `amministrazione` | Notes |
|---|---|---|---|---|
| View own profile | ✅ | ✅ | ✅ | — |
| View any profile | ❌ | ✅* | ✅ | Resp: own communities only |
| Edit own profile (limited fields) | ✅* | ✅ | ✅ | Collab: email, IBAN, phone, address, tshirt, partita_iva, sono_un_figlio_a_carico, avatar |
| Edit any profile | ❌ | ✅* | ✅ | Resp: community members only, no IBAN |
| Edit IBAN / intestatario_pagamento | ✅ | ❌ | ✅ | Sensitive payment fields — resp excluded |
| Edit username | ❌ | ✅* | ✅ | Own community only via username-only route |
| Edit data_ingresso | ❌ | ❌ | ✅ | Admin-only |
| Edit tipo_contratto | ❌ | ❌ | ✅ | Admin-only |
| Edit importo_lordo_massimale | ✅* | ✅* | ✅ | Collab/resp: own record only via profile API |
| Edit citta | ✅ | ❌ | ✅ | Self-edit (/api/profile) and admin (/api/admin/collaboratori/[id]/profile). Resp: read-only |
| Edit materie_insegnate | ✅ | ❌ | ✅ | Self-edit (/api/profile) and admin (/api/admin/collaboratori/[id]/profile). Resp: read-only. Min 1 required |
| Manage lookup_options (città/materie lists) | ❌ | ❌ | ✅ | Admin-only via /api/admin/lookup-options. GET available to all authenticated |
| Invite (create) new user | ❌ | ❌ | ✅ | Invite-only flow, email+password shown in UI |
| Deactivate / change member_status | ❌ | ❌ | ✅ | Includes uscente_con_compenso / uscente_senza_compenso |
| Reset password | ❌ | ❌ | ✅ | Via admin panel |
| View collaborator list | ❌ | ✅* | ✅ | Resp: community members only |

**Contracts**: `docs/profile-editing-contract.md`

---

## 2. Compensation

| Action | `collaboratore` | `responsabile_compensi` | `amministrazione` | Notes |
|---|---|---|---|---|
| View own compensations | ✅ | ✅ | ✅ | — |
| View community compensations | ❌ | ✅* | ✅ | Resp: assigned communities only |
| View all compensations | ❌ | ❌ | ✅ | — |
| Create compensation (individual) | ❌ | ✅* | ✅ | Resp: for community members. Always IN_ATTESA |
| Create compensation (GSheet import) | ❌ | ❌ | ✅ | Admin-only |
| Edit compensation fields | ❌ | ❌ | ✅* | Admin only, IN_ATTESA state only |
| Approve compensation | ❌ | ❌ | ✅ | Final — no double-confirm. Massimale check runs |
| Reject compensation | ❌ | ❌ | ✅ | rejection_note required |
| Liquidate compensation | ❌ | ❌ | ✅ | Triggers receipt generation |
| Reopen compensation (RIFIUTATO→IN_ATTESA) | ✅* | ❌ | ✅ | Collab: own only |
| Bulk approve | ❌ | ❌ | ✅ | Coda lavoro — with massimale check |
| Bulk liquidate | ❌ | ❌ | ✅ | Coda lavoro |

**Contract**: `docs/contracts/compensation-fields.md`

---

## 3. Reimbursement

| Action | `collaboratore` | `responsabile_compensi` | `amministrazione` | Notes |
|---|---|---|---|---|
| View own reimbursements | ✅ | — | ✅ | — |
| View community reimbursements | ❌ | ✅* | ✅ | Resp: assigned communities (read-only) |
| View all reimbursements | ❌ | ❌ | ✅ | — |
| Create reimbursement | ✅* | ❌ | ❌ | Collab: own only. Always IN_ATTESA |
| Edit reimbursement | ✅* | ❌ | ❌ | Collab: own + IN_ATTESA state only |
| Upload / remove receipt files | ✅* | ❌ | ❌ | Collab: own + IN_ATTESA state only |
| Approve reimbursement | ❌ | ❌ | ✅ | — |
| Reject reimbursement | ❌ | ❌ | ✅ | rejection_note required |
| Liquidate reimbursement | ❌ | ❌ | ✅ | Triggers receipt generation |
| Reopen reimbursement | ✅* | ❌ | ✅ | Collab: own only |

**Contract**: `docs/contracts/reimbursement-fields.md`

---

## 4. Document

| Action | `collaboratore` | `responsabile_compensi` | `amministrazione` | Notes |
|---|---|---|---|---|
| View own documents | ✅ | — | ✅ | — |
| View community documents | ❌ | ✅* | ✅ | Resp: assigned communities only |
| View all documents | ❌ | ❌ | ✅ | — |
| Upload document (manual) | ❌ | ❌ | ✅ | Admin: any type |
| Generate contract (pdf-lib/docxtemplater) | ❌ | ❌ | ✅ | Admin: from template |
| Generate receipt (auto) | ❌ | ❌ | ✅ | Auto-triggered on liquidate |
| Import CU (bulk) | ❌ | ❌ | ✅ | Via GSheet+Drive |
| Replace document file | ❌ | ❌ | ✅ | Admin: replaces file_url |
| Delete document | ❌ | ❌ | ✅ | Admin: hard delete + Storage cleanup |
| Sign document (DA_FIRMARE→FIRMATO) | ✅* | ❌ | ❌ | Collab: own + DA_FIRMARE state only |
| Reset signature state | ❌ | ❌ | ✅ | Admin: FIRMATO→DA_FIRMARE or NON_RICHIESTO |

**Contract**: `docs/contracts/document-fields.md`

---

## 5. Ticket

| Action | `collaboratore` | `responsabile_compensi` | `amministrazione` | Notes |
|---|---|---|---|---|
| View own tickets | ✅ | ✅ | ✅ | — |
| View community tickets | ❌ | ✅* | ✅ | Resp: via collaborator_communities join chain |
| View all tickets | ❌ | ❌ | ✅ | — |
| Create ticket | ✅ | ✅ | ✅ | All active roles |
| Reply to ticket | ✅* | ✅* | ✅ | Collab: own. Resp: community |
| Change stato (open→working→closed) | ❌ | ✅* | ✅ | Resp: community tickets only |
| Reopen closed ticket | ❌ | ❌ | ✅ | Admin-only |
| Assign ticket | ❌ | ❌ | ✅ | Admin-only |
| Change priority | ❌ | ✅* | ✅ | Resp: community tickets only |

**Contract**: `docs/contracts/ticket-fields.md`

---

## 6. Content (Comunicazioni, Risorse, Eventi, Opportunità, Sconti)

| Action | `collaboratore` | `responsabile_compensi` | `amministrazione` | Notes |
|---|---|---|---|---|
| View content (own communities) | ✅* | ✅* | ✅ | Filtered by community_ids. Empty = all |
| Create content | ❌ | ❌ | ✅ | Admin-only |
| Edit content | ❌ | ❌ | ✅ | Admin-only |
| Delete content | ❌ | ❌ | ✅ | Admin-only |
| Publish content (triggers notification) | ❌ | ❌ | ✅ | On create — no separate publish step |
| Target content by community | — | — | ✅ | community_ids[] — empty = all |

**Note**: `can_publish_announcements` column exists in `user_profiles` but is **no longer used** — content is admin-only.
**Contract**: `docs/contracts/content-fields.md`

---

## 7. Corsi

> Fully defined across corsi-1 (foundation), corsi-2 (collab candidature), corsi-3 (resp.citt landing, review, valutazioni).

| Action | `collaboratore` | `responsabile_cittadino` | `responsabile_compensi` | `amministrazione` | Notes |
|---|---|---|---|---|---|
| View corso list | ✅ | ✅ | ❌ | ✅ | Collab: own community (programmato/attivo). Resp.citt: /corsi/assegnazione |
| View corso detail | ✅ | ✅ | ❌ | ✅ | Resp.citt: scoped to citta_responsabile |
| Create corso | ❌ | ❌ | ❌ | ✅ | Admin-only |
| Edit corso (all fields) | ❌ | ❌ | ❌ | ✅ | Admin-only |
| Edit corso (city assignment) | ❌ | ❌ | ❌ | ✅ | Admin assigns città from candidature città tab |
| Delete corso | ❌ | ❌ | ❌ | ✅ | Cascades to lezioni → assegnazioni/candidature |
| Add / edit / delete lezione | ❌ | ❌ | ❌ | ✅ | Admin-only |
| View lezioni | ✅ | ✅ | ❌ | ✅ | — |
| Submit candidatura (lezione) | ✅ | ❌ | ❌ | ❌ | Collab: docente_lezione or qa_lezione; blacklist + duplicate check |
| Withdraw candidatura (lezione) | ✅ | ❌ | ❌ | ❌ | Collab: own in_attesa only |
| Submit candidatura (città) | ❌ | ✅ | ❌ | ❌ | Resp.citt: citta_corso type; per corso |
| Withdraw candidatura (città) | ❌ | ✅ | ❌ | ❌ | Resp.citt: own in_attesa only |
| Review candidatura (lezione) | ❌ | ✅ | ❌ | ✅ | Resp.citt: corsi where citta = citta_responsabile; stato → accettata or ritirata |
| Manage assegnazioni | ❌ | ❌ | ❌ | ✅ | Admin: full CRUD |
| Set valutazione | ❌ | ✅ | ❌ | ❌ | Resp.citt: assegnazioni for their city's corsi; score 1–10 |
| View blacklist | ❌ | ✅ | ❌ | ✅ | Read-only for resp.citt |
| Manage blacklist | ❌ | ❌ | ❌ | ✅ | Admin: add/remove |
| View allegati globali | ✅ | ✅ | ✅ | ✅ | All authenticated |
| Manage allegati globali | ❌ | ❌ | ❌ | ✅ | Admin: upload/replace |

**Contract**: `docs/contracts/corsi-fields.md`

---

## 8. User Management (was §7)

| Action | `collaboratore` | `responsabile_compensi` | `amministrazione` | Notes |
|---|---|---|---|---|
| View user list | ❌ | ✅* | ✅ | Resp: own communities only |
| Invite new user | ❌ | ❌ | ✅ | Email+password shown as backup |
| Deactivate user (is_active=false) | ❌ | ❌ | ✅ | — |
| Change member_status | ❌ | ❌ | ✅ | attivo / uscente_con_compenso / uscente_senza_compenso |
| Reset password | ❌ | ❌ | ✅ | Admin panel — generates new password |
| Change email | ❌ | ❌ | ✅ | Via `supabase.auth.admin.updateUserById()` |
| View own profile page | ✅ | ✅ | ✅ | /profilo — available to all |

---

## 8. Community Management

| Action | `collaboratore` | `responsabile_compensi` | `amministrazione` | Notes |
|---|---|---|---|---|
| View own community | ✅ | ✅ | ✅ | — |
| View all communities | ❌ | ❌ | ✅ | — |
| Create community | ❌ | ❌ | ✅ | — |
| Assign collaborator to community | ❌ | ❌ | ✅ | 1 community per collaborator (UNIQUE constraint, migration 043) |
| Manage responsabile access (user_community_access) | ❌ | ❌ | ✅ | Impostazioni > Community |

---

## 9. Import

| Action | `collaboratore` | `responsabile_compensi` | `amministrazione` | Notes |
|---|---|---|---|---|
| Import collaboratori (preview) | ❌ | ❌ | ✅ | GSheet → validate only |
| Import collaboratori (run) | ❌ | ❌ | ✅ | GSheet → insert + invite emails |
| Import compensazioni (GSheet) | ❌ | ❌ | ✅ | Preview + confirm flow |
| Import contratti (preview + run) | ❌ | ❌ | ✅ | Drive download → Storage → DB |
| Import CU (preview + run) | ❌ | ❌ | ✅ | Drive download → Storage → DB → notify |

---

## 10. Export

| Action | `collaboratore` | `responsabile_compensi` | `amministrazione` | Notes |
|---|---|---|---|---|
| Export to GSheet | ❌ | ❌ | ✅ | Grouped by collaborator |
| View export history | ❌ | ❌ | ✅ | — |
| Download CSV | ❌ | ❌ | ✅ | Native CSV via SheetJS |

---

## 11. Impostazioni

| Action | `collaboratore` | `responsabile_compensi` | `amministrazione` | Notes |
|---|---|---|---|---|
| Manage email templates | ❌ | ❌ | ✅ | 12 templates E1–E12 |
| Manage email layout config | ❌ | ❌ | ✅ | Header/footer/colors |
| Manage compensation competenze | ❌ | ❌ | ✅ | compensation_competenze table |
| Manage contract templates | ❌ | ❌ | ✅ | PDF/DOCX templates |
| Manage community settings | ❌ | ❌ | ✅ | can_publish_announcements toggle (legacy) |
| View monitoring (Monitoraggio tab) | ❌ | ❌ | ✅ | System status, logs, errors |
| Configure notification settings | ❌ | ❌ | ✅ | notification_settings table (19 rows) |

---

## 12. Notifications

| Action | `collaboratore` | `responsabile_compensi` | `amministrazione` | Notes |
|---|---|---|---|---|
| View own notifications | ✅ | ✅ | ✅ | NotificationBell + /notifiche page |
| Mark notification as read | ✅ | ✅ | ✅ | Own only |
| Dismiss notification | ✅ | ✅ | ✅ | Own only |
| Receive compensation notifications | ✅* | ✅* | ✅* | Based on event_key in notification_settings |
| Receive content notifications | ✅ | ✅ | — | E10/E11/E12 broadcast |
| Receive ticket notifications | ✅* | ✅* | ✅* | Own/community scope |

---

## Member Status — Access Restrictions

| Status | Access |
|---|---|
| `attivo` | Full access per role |
| `uscente_con_compenso` | Normal access; can view ongoing requests, no new document uploads |
| `uscente_senza_compenso` | Read-only: `/documenti` only |

---

## Dependency Check Protocol

Before starting any block that changes role permissions:

1. **New action for existing role**: update the relevant entity row + linked contract file (`docs/contracts/`)
2. **New role**: add a column to every table in this document + update `entity-manifest.md` + `lib/types.ts` RoleType + proxy.ts guards + `lib/nav.ts`
3. **Permission removal**: update this matrix + API auth check + UI button/action visibility + RLS policy
4. **Member status restriction change**: update the member status table above + `proxy.ts` + `is_active_user()` RLS helper
