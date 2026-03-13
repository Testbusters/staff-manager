# Content Fields Contract

> **Mandatory reference for any block touching content data.**
> Covers all 5 content types: Communications, Events, Resources, Opportunities, Discounts.
> Every block that modifies content schema, field permissions, or publishing logic
> must verify alignment across all entry points and update this document accordingly.

---

## Content Types

| Type | Table | Notification | Expiry field |
|---|---|---|---|
| Comunicazione | `communications` | E10 | — |
| Evento | `events` | E11 | `data_fine` |
| Risorsa | `resources` | E12 (maschile) | — |
| Opportunità | `opportunities` | E12 (femminile) | `data_scadenza` |
| Sconto | `discounts` | E12 (maschile) | `data_scadenza` |

---

## Entry Points

| Entry point | Route / Component | Auth | Notes |
|---|---|---|---|
| **Create** | `POST /api/contenuti/[tipo]` | `amministrazione` | Publishes immediately; triggers notification |
| **Edit** | `PATCH /api/contenuti/[tipo]/[id]` | `amministrazione` | No re-notification on edit |
| **Delete** | `DELETE /api/contenuti/[tipo]/[id]` | `amministrazione` | Hard delete |
| **Read list** | `GET /api/contenuti/[tipo]` | `collaboratore`, `responsabile_compensi`, `amministrazione` | Community-filtered for collab/resp |
| **Read detail** | `GET /api/contenuti/[tipo]/[id]` | Same as list | 404 if not visible for requesting user's community |

---

## Common Field Permission Matrix

| Campo | Admin Create | Admin Edit | Collab/Resp Read | Notes |
|---|---|---|---|---|
| `titolo` | ✅ required | ✅ | ✅ | — |
| `contenuto` | ✅ required | ✅ | ✅ | Tiptap HTML |
| `community_ids` | ✅ ([] = all) | ✅ | ❌ | UUID[]. Empty = visible to all |
| `published_at` | — (auto: now) | ❌ immutable | ✅ | Set at creation |
| `tag` | ✅ optional | ✅ | ✅ | Used for filtering (e.g. `procedura-piva`) |

### Events-specific fields

| Campo | Admin Create | Admin Edit | Notes |
|---|---|---|---|
| `data_inizio` | ✅ required | ✅ | Event start |
| `data_fine` | ✅ optional | ✅ | Expiry — hides event after date |
| `luogo` | ✅ optional | ✅ | Free text location |

### Opportunities / Discounts-specific fields

| Campo | Admin Create | Admin Edit | Notes |
|---|---|---|---|
| `data_scadenza` | ✅ optional | ✅ | Expiry date |
| `url_esterno` | ✅ optional | ✅ | External CTA link |

---

## Community Targeting Logic

- `community_ids = []` → visible to all active collaborators.
- `community_ids = [uuid1, uuid2]` → visible only to collaborators belonging to those communities.
- Filtering is **in-memory** (not PostgREST array operators) — safer, avoids syntax issues.
- Detail page: `community_ids.length > 0 && !some(overlap with user's communities)` → `notFound()`.
- `getCollaboratoriForCommunities(communityIds, svc)`: if empty → `getAllActiveCollaboratori`; else two-step join via `collaborator_communities`.

---

## Notification Dispatch

On create:
1. Determine target audience: `community_ids.length > 0` → `getCollaboratoriForCommunities`; else → `getAllActiveCollaboratori`.
2. Call `buildContentNotification(userId, contentType, contentId, titolo)` for each user.
3. Batch insert into `notifications` table.
4. Fire-and-forget email via Resend (E10/E11/E12 template). Wrap in try/catch — notification failures must not block the API response.

---

## Validation Rules

| Campo | Rule |
|---|---|
| `titolo` | Required, non-empty string |
| `contenuto` | Required, non-empty Tiptap HTML string |
| `community_ids` | UUID[] — each entry must be a valid community UUID |
| `data_fine` / `data_scadenza` | ISO date string, optional |

---

## Dependency Check Protocol

Before starting any block that touches content data:

1. **New content type**: add table + API routes + ContentType enum + nav item + ContentStatusBadge mapping + notification template
2. **Community targeting change**: update `getCollaboratoriForCommunities` + detail page visibility check + content list filter
3. **Field addition**: update create/edit API + ContentForm component + `buildContentNotification` if titolo field changes
4. **Notification change**: update the relevant email template (E10/E11/E12) + notification-utils.ts

---

## Known Constraints

- `can_publish_announcements` column exists in `user_profiles` but is **no longer used** for write access — `/contenuti` is admin-only. Do not re-enable responsabile write access without explicit product decision.
- Tiptap 3 editor: always add `immediatelyRender: false` to `useEditor()` — required to prevent Next.js hydration errors.
- `resources` table is reused for fiscal guides (P.IVA, deductions) via `.contains('tag', ['tag-name'])` — no separate table. Tags: `procedura-piva`, `detrazioni-figli`.
- Badge colors for content types are centralized in `lib/content-badge-maps.ts` (refactored in UI Audit Wave 3). Update that file when adding new content types.
