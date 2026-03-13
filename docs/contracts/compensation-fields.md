# Compensation Fields Contract

> **Mandatory reference for any block touching compensation data.**
> Every block that modifies compensation schema, field permissions, or state transitions
> must verify alignment across all entry points and update this document accordingly.

---

## Entry Points

| Entry point | Route / Component | Auth | Notes |
|---|---|---|---|
| **Individual form** | `POST /api/compensations` | `responsabile_compensi`, `amministrazione` | Always creates IN_ATTESA |
| **GSheet import preview** | `POST /api/compensations/import/preview` | `amministrazione` | Validates only, no DB write |
| **GSheet import confirm** | `POST /api/compensations/import/confirm` | `amministrazione` | Stateless re-validate + insert + GSheet writeback |
| **Admin edit** | `PATCH /api/compensations/[id]` | `amministrazione` | Edit allowed in IN_ATTESA only |
| **Status transition** | `PATCH /api/compensations/[id]` (action param) | `amministrazione` | approve / reject / liquidate / reopen |
| **Coda lavoro bulk** | `POST /api/compensations/bulk-approve`, `/bulk-liquidate` | `amministrazione` | Bulk transitions with massimale check |

---

## Field Permission Matrix

| Campo | Individual Form | GSheet Import | Admin Edit | Notes |
|---|---|---|---|---|
| `collaborator_id` | ✅ required | ✅ (via username) | ❌ immutable | Derived from `username` in import |
| `competenza` | ✅ required | ✅ column G | ✅ | FK → `compensation_competenze.key` (active rows only) |
| `nome_servizio_ruolo` | ✅ required | ✅ column D | ✅ | Was `descrizione` before migration 030 |
| `info_specifiche` | ✅ optional | ✅ column E | ✅ | Was `note_interne` before migration 030 |
| `data_competenza` | ✅ required | ✅ column A | ✅ | ISO date string |
| `importo_lordo` | ✅ required | ✅ column B | ✅ | Positive numeric |
| `ritenuta_acconto` | ✅ optional | — | ✅ | Withholding rate (e.g. 20 = 20%) |
| `community_id` | — | — | — | Always null since migration 030 |
| `stato` | — (auto IN_ATTESA) | — (auto IN_ATTESA) | ❌ | Changed only via action transitions |
| `rejection_note` | — | — | ✅ (on reject action) | Required when `action=reject` |

---

## State Transition Permissions

| Transition | From | To | Role | Notes |
|---|---|---|---|---|
| approve | IN_ATTESA | APPROVATO | `amministrazione` | Massimale check runs; blocks if over limit |
| reject | IN_ATTESA, APPROVATO | RIFIUTATO | `amministrazione` | `rejection_note` required |
| liquidate | APPROVATO | LIQUIDATO | `amministrazione` | Triggers receipt generation |
| reopen | RIFIUTATO | IN_ATTESA | `collaboratore` | Via dedicated UI button |

---

## Validation Rules

| Campo | Rule |
|---|---|
| `competenza` | Must exist in `compensation_competenze` with `active=true` |
| `importo_lordo` | Positive number, max 2 decimal places |
| `data_competenza` | Valid ISO date, not in the future |
| `username` (import) | Must match an existing `collaborators.username` (case-sensitive) |
| `rejection_note` | Required string when `action=reject`; server enforces via `canTransition` |

---

## GSheet Column Layout (V2)

| Column | Field | Notes |
|---|---|---|
| A | `data_competenza` | YYYY-MM-DD |
| B | `importo_lordo` | Numeric |
| C | `username` | Used for collaborator lookup |
| D | `nome_servizio_ruolo` | Free text |
| E | `info_specifiche` | Free text |
| F | `stato` | Written by run: `PROCESSED` or `ERROR` |
| G | `competenza` | Must match `compensation_competenze.key` |

---

## Dependency Check Protocol

Before starting any block that touches compensation data:

1. **Schema change** (new column): update this matrix + all entry points + GSheet import mapping
2. **State machine change**: update `lib/transitions.ts` + all 3 transition API routes + `canTransition` visibility checks
3. **Permission change** (new role gets access): update this matrix + API auth checks + Coda lavoro UI
4. **Field rename**: grep all 6 entry points before declaring file list

---

## Known Constraints

- `community_id` is always `null` — do not use it for filtering or assignment.
- `competenza` uses a configurable lookup table (`compensation_competenze`) — not a Postgres enum. Always fetch active rows.
- Massimale check runs on every `approve` action — reads `approved_lordo_ytd` from `collaborators`.
- GSheet writeback (column F = PROCESSED) is non-blocking — DB insert succeeds even if writeback fails.
- `responsabile_compensi` can CREATE but NOT approve/reject/liquidate compensations.
