# Ticket Fields Contract

> **Mandatory reference for any block touching ticket data.**
> Every block that modifies ticket schema, field permissions, or state transitions
> must verify alignment across all entry points and update this document accordingly.

---

## Entry Points

| Entry point | Route / Component | Auth | Notes |
|---|---|---|---|
| **Create** | `POST /api/tickets` | All active roles | Any active collaboratore, resp, or admin |
| **Reply** | `POST /api/tickets/[id]/messages` | Creator + admin + resp (community) | Adds a message thread entry |
| **Update stato** | `PATCH /api/tickets/[id]` | `amministrazione`, `responsabile_compensi` (community) | Stato transitions only |
| **Read list** | `GET /api/tickets` | Role-filtered | Collab: own. Resp: community. Admin: all |
| **Read detail** | `GET /api/tickets/[id]` | Same filters as list | Includes message thread |

---

## Field Permission Matrix

| Campo | Create | Edit (admin/resp) | Notes |
|---|---|---|---|
| `titolo` | ✅ required | ❌ immutable | — |
| `descrizione` | ✅ required | ❌ immutable | Initial message body |
| `stato` | — (auto APERTO) | ✅ (via action) | `APERTO \| IN_LAVORAZIONE \| CHIUSO` |
| `priority` | ✅ (default NORMALE) | ✅ | `ALTA \| NORMALE \| BASSA` |
| `creator_user_id` | ✅ (auto: own) | ❌ immutable | FK to `auth.users` (not `collaborators`) |
| `community_id` | ✅ (auto: creator's community) | ❌ immutable | Nullable; null = no community filter |
| `assigned_to` | — | ✅ (admin only) | Optional assignment |

---

## State Transition Permissions

| Transition | From | To | Role | Notes |
|---|---|---|---|---|
| start | APERTO | IN_LAVORAZIONE | `amministrazione`, `responsabile_compensi` | Indicates work has begun |
| close | IN_LAVORAZIONE, APERTO | CHIUSO | `amministrazione`, `responsabile_compensi` | Terminal state |
| reopen | CHIUSO | APERTO | `amministrazione` | Admin-only reopen |

---

## Message Thread

Ticket messages are stored separately (join table or embedded array — verify current schema).
- Every reply creates a notification (E9) to the other party.
- Admin replies are visible to collaboratore and vice versa.

---

## RLS and Access Control

| Role | Visible tickets |
|---|---|
| `collaboratore` | Own (`creator_user_id = auth.uid()`) |
| `responsabile_compensi` | Community tickets via `creator_user_id → collaborators → collaborator_communities → user_community_access` join chain |
| `amministrazione` | All |

**Critical**: `tickets_manager_read` RLS uses the join chain above — NOT `can_manage_community(community_id)` (returns false for NULL community_id). Do not simplify this RLS policy.

---

## Validation Rules

| Campo | Rule |
|---|---|
| `titolo` | Required, non-empty string |
| `descrizione` | Required, non-empty string |
| `stato` | Must be one of 3 allowed values |
| `priority` | Must be one of 3 allowed values |

---

## Dependency Check Protocol

Before starting any block that touches ticket data:

1. **Schema change** (new column): update this matrix + create route + read routes + TicketDetail component
2. **State machine change**: update transition logic + PATCH route + UI action buttons + `[data-ticket-stato]` selectors
3. **RLS change**: verify the join chain is preserved — do NOT simplify to `can_manage_community`
4. **Notification change**: update E9 template + notification trigger in reply route

---

## Known Constraints

- Ownership uses `creator_user_id` (FK to `auth.users`), not `collaborator_id`. Never use `collaborator_id` for ticket ownership.
- Always use `serviceClient` (service role) for fetch + insert in ticket API routes. Explicit access control in code — do NOT delegate to SSR-side RLS.
- E2e selector: `[data-ticket-stato="CHIUSO"]` (not CSS color class). Badge renders `<div>`, not `<span>`.
