# Sitemap — Staff Manager

Last updated: 2026-03-04

Columns: **Route** | **Page file** | **Roles** | **Access notes**

Legend:
- `collab` = `collaboratore`
- `resp` = `responsabile_compensi`
- `admin` = `amministrazione`
- `all` = all authenticated roles
- `*` = member_status restriction applies (see note)

---

## Pre-auth / Special flows

| Route | Page file | Roles | Access notes |
|---|---|---|---|
| `/login` | `app/login/page.tsx` | unauthenticated | Redirects to `/` if already authenticated |
| `/pending` | `app/pending/page.tsx` | authenticated | Shown when `is_active = false` |
| `/change-password` | `app/change-password/page.tsx` | authenticated | Shown when `must_change_password = true` (proxy-enforced) |
| `/onboarding` | `app/onboarding/page.tsx` | authenticated | Shown when `onboarding_completed = false` (proxy-enforced) |
| `/auth/callback` | `app/auth/callback/route.ts` | unauthenticated | OAuth callback handler |

---

## Dashboard

| Route | Page file | Roles | Access notes |
|---|---|---|---|
| `/` | `app/(app)/page.tsx` | all | Role-specific content: Admin dashboard / Responsabile dashboard / Collaboratore dashboard |

---

## Common routes (all roles)

| Route | Page file | Roles | Access notes |
|---|---|---|---|
| `/profilo` | `app/(app)/profilo/page.tsx` | all | Own profile view + documents tab. Admin/Responsabile see own profile only |
| `/notifiche` | `app/(app)/notifiche/page.tsx` | all | Notification center |

---

## Collaboratore routes

| Route | Page file | Roles | Access notes |
|---|---|---|---|
| `/compensi` | `app/(app)/compensi/page.tsx` | collab | Blocked if `member_status = uscente_senza_compenso` → redirect `/profilo?tab=documenti` |
| `/compensi/[id]` | `app/(app)/compensi/[id]/page.tsx` | collab | Detail view of own compensation |
| `/rimborsi` | `app/(app)/rimborsi/page.tsx` | collab | Own reimbursement list |
| `/rimborsi/nuova` | `app/(app)/rimborsi/nuova/page.tsx` | collab | Create new reimbursement |
| `/rimborsi/[id]` | `app/(app)/rimborsi/[id]/page.tsx` | collab | Detail view of own reimbursement |
| `/comunicazioni` | `app/(app)/comunicazioni/page.tsx` | collab | Read-only announcements feed |
| `/comunicazioni/[id]` | `app/(app)/comunicazioni/[id]/page.tsx` | collab | Announcement detail |
| `/eventi` | `app/(app)/eventi/page.tsx` | collab | Read-only events feed |
| `/eventi/[id]` | `app/(app)/eventi/[id]/page.tsx` | collab | Event detail |
| `/opportunita` | `app/(app)/opportunita/page.tsx` | collab | Read-only opportunities + discounts feed |
| `/opportunita/[id]` | `app/(app)/opportunita/[id]/page.tsx` | collab | Opportunity detail |
| `/sconti/[id]` | `app/(app)/sconti/[id]/page.tsx` | collab | Discount detail |
| `/risorse/[id]` | `app/(app)/risorse/[id]/page.tsx` | collab | Resource detail |

---

## Responsabile Compensi routes

| Route | Page file | Roles | Access notes |
|---|---|---|---|
| `/approvazioni` | `app/(app)/approvazioni/page.tsx` | resp | Tabs: Compensi + Rimborsi. View assigned communities. Read-only: cannot approve/reject/liquidate (admin-only). |
| `/approvazioni/carica` | `app/(app)/approvazioni/carica/page.tsx` | resp | Bulk import compensations from Google Sheets |

---

## Multi-role routes

| Route | Page file | Roles | Access notes |
|---|---|---|---|
| `/ticket` | `app/(app)/ticket/page.tsx` | collab + resp + admin | `uscente_senza_compenso` → redirect `/documenti`. Manager view vs collaboratore view based on role. |
| `/ticket/nuova` | `app/(app)/ticket/nuova/page.tsx` | collab + resp + admin | `uscente_senza_compenso` blocked |
| `/ticket/[id]` | `app/(app)/ticket/[id]/page.tsx` | collab + resp + admin | Chat UI. Manager can change status. |
| `/documenti` | `app/(app)/documenti/page.tsx` | admin (write) + resp (read) | Admin: upload, manage. Responsabile: read-only list of assigned communities' docs. |
| `/documenti/[id]` | `app/(app)/documenti/[id]/page.tsx` | admin (write) + resp (read) | Signature status, download. Admin can upload new version. |
| `/contenuti` | `app/(app)/contenuti/page.tsx` | admin (write) + resp (read) | Manage Comunicazioni / Eventi / Opportunità / Sconti / Risorse. Responsabile read-only. |

---

## Admin-only routes

| Route | Page file | Roles | Access notes |
|---|---|---|---|
| `/coda` | `app/(app)/coda/page.tsx` | admin | Work queue: documents needing action, pending payments |
| `/collaboratori` | `app/(app)/collaboratori/page.tsx` | admin | Full collaborator list with filters + pagination |
| `/collaboratori/[id]` | `app/(app)/collaboratori/[id]/page.tsx` | admin | Profile detail + edit + document history |
| `/export` | `app/(app)/export/page.tsx` | admin | CSV/XLSX export of compensations and reimbursements |
| `/import` | `app/(app)/import/page.tsx` | admin | Bulk import UI for collaboratori, contratti, CU |
| `/impostazioni` | `app/(app)/impostazioni/page.tsx` | admin | Community config, notification settings, contract templates, email template management |
| `/feedback` | `app/(app)/feedback/page.tsx` | admin | User feedback/suggestions |

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

Source files to keep in sync: `lib/nav.ts` (sidebar items), `proxy.ts` (redirect chain), individual `page.tsx` files (role guards).
