# Sitemap — Staff Manager

Last updated: 2026-03-11

Columns: **Route** | **Page file** | **Roles** | **Layout** | **Componenti chiave** | **loading.tsx** | **Access notes**

Legend:
- `collab` = `collaboratore`
- `resp` = `responsabile_compensi`
- `admin` = `amministrazione`
- `all` = all authenticated roles
- `*` = member_status restriction applies (see note)

Layout values: `auth-form` | `full-list` | `detail` | `detail+timeline` | `tabs` | `feed` | `form` | `wizard` | `chat` | `dashboard` | `import-panel`

**Consult this file first** — before running Grep/Explore across all pages for cross-cutting tasks (responsive audit, token normalization, empty-state review, loading.tsx audit). The Layout + Componenti columns give the full picture without a codebase scan.

---

## Pre-auth / Special flows

| Route | Page file | Roles | Layout | Componenti chiave | loading.tsx | Access notes |
|---|---|---|---|---|---|---|
| `/login` | `app/login/page.tsx` | unauthenticated | `auth-form` | Card, Form, Input, Button | n/a | Redirects to `/` if already authenticated |
| `/pending` | `app/pending/page.tsx` | authenticated | `auth-form` | Card | n/a | Shown when `is_active = false` |
| `/change-password` | `app/change-password/page.tsx` | authenticated | `auth-form` | Card, Form, Input | n/a | Shown when `must_change_password = true` (proxy-enforced) |
| `/onboarding` | `app/onboarding/page.tsx` | authenticated | `wizard` | multi-step Form, Input, Select, Dialog | n/a | Shown when `onboarding_completed = false` (proxy-enforced) |
| `/auth/callback` | `app/auth/callback/route.ts` | unauthenticated | — | — | n/a | OAuth callback handler |

---

## Dashboard

| Route | Page file | Roles | Layout | Componenti chiave | loading.tsx | Access notes |
|---|---|---|---|---|---|---|
| `/` | `app/(app)/page.tsx` | all | `dashboard` | Card, Table, Badge, EmptyState | ✅ | Role-specific content: Admin / Responsabile / Collaboratore dashboard |

---

## Common routes (all roles)

| Route | Page file | Roles | Layout | Componenti chiave | loading.tsx | Access notes |
|---|---|---|---|---|---|---|
| `/profilo` | `app/(app)/profilo/page.tsx` | all | `tabs` | Tabs, Form, Input, Avatar, Table, Badge | ✅ | Own profile view + documents tab. Admin/Responsabile see own profile only |
| `/notifiche` | `app/(app)/notifiche/page.tsx` | all | `full-list` | list rows, Badge, EmptyState | ✅ | Notification center |

---

## Collaboratore routes

| Route | Page file | Roles | Layout | Componenti chiave | loading.tsx | Access notes |
|---|---|---|---|---|---|---|
| `/compensi` | `app/(app)/compensi/page.tsx` | collab | `full-list` | Table, Badge, EmptyState | ✅ | Blocked if `member_status = uscente_senza_compenso` → redirect `/profilo?tab=documenti` |
| `/compensi/[id]` | `app/(app)/compensi/[id]/page.tsx` | collab | `detail+timeline` | Card, Badge, timeline rows | ✅ | Detail view of own compensation |
| `/rimborsi` | `app/(app)/rimborsi/page.tsx` | collab | `full-list` | Table, Badge, EmptyState | ✅ | Own reimbursement list |
| `/rimborsi/nuova` | `app/(app)/rimborsi/nuova/page.tsx` | collab | `form` | Form, Input, Select, Textarea | ✅ | Create new reimbursement |
| `/rimborsi/[id]` | `app/(app)/rimborsi/[id]/page.tsx` | collab | `detail+timeline` | Card, Badge, timeline rows | ✅ | Detail view of own reimbursement |
| `/comunicazioni` | `app/(app)/comunicazioni/page.tsx` | collab | `feed` | Card, Badge, EmptyState | ✅ | Read-only announcements feed |
| `/comunicazioni/[id]` | `app/(app)/comunicazioni/[id]/page.tsx` | collab | `detail` | Card, Tiptap (read-only) | ✅ | Announcement detail |
| `/eventi` | `app/(app)/eventi/page.tsx` | collab | `feed` | Card, Badge, EmptyState | ✅ | Read-only events feed |
| `/eventi/[id]` | `app/(app)/eventi/[id]/page.tsx` | collab | `detail` | Card, Tiptap (read-only) | ✅ | Event detail |
| `/opportunita` | `app/(app)/opportunita/page.tsx` | collab | `feed` | Tabs, Card, EmptyState | ✅ | Read-only opportunities + discounts feed |
| `/opportunita/[id]` | `app/(app)/opportunita/[id]/page.tsx` | collab | `detail` | Card, Tiptap (read-only) | ✅ | Opportunity detail |
| `/sconti/[id]` | `app/(app)/sconti/[id]/page.tsx` | collab | `detail` | Card, Tiptap (read-only) | ✅ | Discount detail |
| `/risorse/[id]` | `app/(app)/risorse/[id]/page.tsx` | collab | `detail` | Card, Tiptap (read-only) | ✅ | Resource detail |

---

## Responsabile Compensi routes

| Route | Page file | Roles | Layout | Componenti chiave | loading.tsx | Access notes |
|---|---|---|---|---|---|---|
| `/approvazioni` | `app/(app)/approvazioni/page.tsx` | resp | `tabs` | Tabs, Table, Badge, EmptyState | ✅ | Tabs: Compensi + Rimborsi. View assigned communities. Read-only: cannot approve/reject/liquidate (admin-only). |
| `/approvazioni/carica` | `app/(app)/approvazioni/carica/page.tsx` | resp | `import-panel` | Form, Table (preview), Dialog | ✅ | Bulk import compensations from Google Sheets |

---

## Multi-role routes

| Route | Page file | Roles | Layout | Componenti chiave | loading.tsx | Access notes |
|---|---|---|---|---|---|---|
| `/ticket` | `app/(app)/ticket/page.tsx` | collab + resp + admin | `full-list` | Table, Badge, EmptyState | ✅ | `uscente_senza_compenso` → redirect `/documenti`. Manager view vs collaboratore view based on role. |
| `/ticket/nuova` | `app/(app)/ticket/nuova/page.tsx` | collab + resp + admin | `form` | Form, Input, Select, Textarea | ✅ | `uscente_senza_compenso` blocked |
| `/ticket/[id]` | `app/(app)/ticket/[id]/page.tsx` | collab + resp + admin | `chat` | Chat messages, Input, Badge, Dialog | ✅ | Chat UI. Manager can change status. |
| `/documenti` | `app/(app)/documenti/page.tsx` | admin (write) + resp (read) | `full-list` | Table, Badge, Dialog, Sheet | ✅ | Admin: upload, manage. Responsabile: read-only list of assigned communities' docs. |
| `/documenti/[id]` | `app/(app)/documenti/[id]/page.tsx` | admin (write) + resp (read) | `detail` | Card, Badge, Dialog | ✅ | Signature status, download. Admin can upload new version. |
| `/contenuti` | `app/(app)/contenuti/page.tsx` | admin (write) + resp (read) | `tabs` | Tabs, Table, Dialog, Tiptap, EmptyState | ✅ | Manage Comunicazioni / Eventi / Opportunità / Sconti / Risorse. Responsabile read-only. |

---

## Admin-only routes

| Route | Page file | Roles | Layout | Componenti chiave | loading.tsx | Access notes |
|---|---|---|---|---|---|---|
| `/coda` | `app/(app)/coda/page.tsx` | admin | `tabs` | Tabs, Table, Badge, Dialog, stats strip | ✅ | Work queue: documents needing action, pending payments |
| `/collaboratori` | `app/(app)/collaboratori/page.tsx` | admin | `full-list` | Table, Badge, Pagination, EmptyState | ✅ | Full collaborator list with filters + pagination |
| `/collaboratori/[id]` | `app/(app)/collaboratori/[id]/page.tsx` | admin | `tabs` | Tabs, Form, Table, Dialog, Avatar | ✅ | Profile detail + edit + document history |
| `/export` | `app/(app)/export/page.tsx` | admin | `tabs` | Tabs, Form, Table (preview + history) | ✅ | CSV/XLSX export of compensations and reimbursements |
| `/import` | `app/(app)/import/page.tsx` | admin | `import-panel` | Tabs, Table (preview), Dialog, EmptyState | ✅ | Bulk import UI for collaboratori, contratti, CU |
| `/impostazioni` | `app/(app)/impostazioni/page.tsx` | admin | `tabs` | Tabs, Form, Table, Dialog | ✅ | Community config, notification settings, contract templates, email template management |
| `/monitoraggio` | `app/(app)/monitoraggio/page.tsx` | admin | `tabs` | Tabs, Badge, Table, auto-refresh | ✅ | System monitoring: access logs, emails, DB performance, app errors |
| `/feedback` | `app/(app)/feedback/page.tsx` | admin | `full-list` | Table, EmptyState | ✅ | User feedback/suggestions |

---

## Sidebar visibility by role

| Sidebar item | collab | resp | admin |
|---|---|---|---|
| Dashboard / Home | ✅ | ✅ | ✅ |
| Profilo | ✅ | ✅ | — |
| Compensi | ✅ | — | — |
| Rimborsi | ✅ | — | — |
| Ticket | ✅ | ✅ | ✅ |
| Comunicazioni | ✅ | — | — |
| Eventi | ✅ | — | — |
| Opportunità / Sconti | ✅ | — | — |
| Approvazioni | — | ✅ | — |
| Coda lavoro | — | — | ✅ |
| Collaboratori | — | — | ✅ |
| Documenti | — | ✅ (read) | ✅ |
| Export | — | — | ✅ |
| Contenuti | — | ✅ (read) | ✅ |
| Impostazioni | — | — | ✅ |
| Monitoraggio | — | — | ✅ |
| Feedback | — | — | ✅ |

> `responsabile_cittadino` and `responsabile_servizi_individuali` have no nav items defined yet.

---

## Proxy redirect chain

```
Request
  → not authenticated            → /login
  → is_active = false            → /pending
  → must_change_password = true  → /change-password
  → onboarding_completed = false → /onboarding
  → app route reached ✅
```

API routes `/api/*` pass all checks (auth + active only). `/api/health` is fully public.

---

## Maintenance

Update this file in **Phase 8** of any block that:
- Adds or removes a route
- Changes role access to an existing route
- Modifies member_status restrictions
- Adds a new role to the sidebar
- Introduces or changes the layout pattern of a page
- Adds or removes key components from a page (Dialog, Sheet, Tiptap, Tabs…)
- Adds or removes a `loading.tsx`

Source files to keep in sync: `lib/nav.ts` (sidebar items), `proxy.ts` (redirect chain), individual `page.tsx` files (role guards).

### Cross-cutting UI tasks
For tasks that touch many pages at once (responsive audit, token normalization, empty-state sweep, loading.tsx audit):
1. Read this file first to get the full page inventory
2. Filter by **Layout** column to scope the work (e.g. all `full-list` pages, all `tabs` pages)
3. Filter by **Componenti chiave** to find all pages using a specific component
4. Only run Grep/Explore if the answer is not already here
