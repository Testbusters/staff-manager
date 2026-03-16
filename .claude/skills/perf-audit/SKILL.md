---
name: perf-audit
description: Performance audit for the staff-manager web app. Checks bundle size, server/client component boundaries, unnecessary re-renders, image optimization, and N+1 query patterns in API routes. Internal app — Core Web Vitals scoring, SEO meta tags, sitemap.xml, OpenGraph, and Lighthouse public-facing metrics are out of scope.
user-invocable: true
model: sonnet
---

You are performing a performance audit of the staff-manager Next.js application.

**Scope**: bundle size, server/client boundary, re-renders, image optimization, API query efficiency.
**Out of scope**: Lighthouse scores, Core Web Vitals public metrics, SEO meta tags, sitemap.xml, OpenGraph, robots.txt — this is a private internal webapp, not indexed.
**Do NOT make code changes. Audit only.**
**All findings go to `docs/backlog-refinement.md`.**

---

## Step 1 — Read structural guides

Read `docs/sitemap.md` — note:
- All page routes and their "Componenti chiave"
- Which pages are server components vs client components (look for `'use client'` markers in sitemap notes)

Read `docs/db-map.md` "Missing indexes" section — these are already flagged DB-side, skip them here (covered by `/skill-db`).

Read current `docs/backlog-refinement.md` to avoid duplicates.

---

## Step 2 — Server/Client boundary audit (Explore agent)

Launch a **single Explore subagent** (model: haiku) with all page and layout files from the sitemap:

"Run all 4 checks on the provided files:

**CHECK B1 — Unnecessary 'use client' on page shells**
For each file in `app/(app)/*/page.tsx`:
- Check if `'use client'` is present at the top
- If yes: check if the page uses `useState`, `useEffect`, `useRouter`, `useSearchParams`, or browser APIs directly
- If the page only renders data and passes props to child components: flag as a candidate to remove `'use client'` and make it a server component
Flag: each page with `'use client'` that has no direct hook usage.

**CHECK B2 — Large client component bundles**
For client components (`'use client'`) with more than 200 lines:
Check if the component imports heavy libraries (e.g. `recharts`, `tiptap`, `react-day-picker`, `date-fns`).
Flag: client components importing heavy libs that are only used in a small portion of their code (candidate for lazy loading or code splitting).

**CHECK B3 — useEffect for data fetching (should be server)**
Pattern: `useEffect` used to fetch data from an API route in a component that could be a server component.
Grep: `useEffect.*fetch\|useEffect.*axios\|useEffect.*supabase` in `components/` files that are NOT in explicitly client-only contexts (modals, interactive forms).
Flag: each match — evaluate if the fetch could move server-side.

**CHECK B4 — Missing React.memo / useMemo on expensive renders**
Pattern: components in list rows that receive object props and re-render on every parent update.
Grep: in files named `*Row.tsx` or `*Item.tsx` or `*Card.tsx` — check if the component is wrapped in `memo()` or has `useMemo` for derived data.
Flag: list row components with no memoization that receive >3 object props."

---

## Step 3 — Image optimization check (main context)

Read the following files (from sitemap "Componenti chiave"):
- Any component using `<img>` HTML element
- `app/(app)/page.tsx` (dashboard — likely has avatar images)
- `components/Sidebar.tsx`

**I1 — Native img vs next/image**
Flag any `<img src=` that should be `<Image from='next/image'` — especially for:
- User avatars (repeated in lists)
- Content images (risorse, eventi file_url)
- Logo/branding images

Note: for externally-hosted images (Supabase Storage), `next/image` requires the domain in `next.config.ts` remotePatterns — check if configured.

**I2 — Avatar image sizing**
Check if avatar `<Image>` components specify explicit `width` and `height` to prevent layout shift.

---

## Step 4 — API query efficiency (main context)

For the 5 list endpoints with the most data (from sitemap API routes):

**Q1 — Unbounded queries**
Read each GET list handler. Check if:
- A `.limit()` or pagination is applied before sending to client
- Any query fetches ALL records for a large table (compensations, expense_reimbursements, notifications) without a date range or user filter

**Q2 — Over-fetching columns**
Check if `.select('*')` is used on wide tables when only 3-5 columns are needed for the list view. Compare selected columns vs columns actually rendered in the list component.

**Q3 — Serial awaits that could be parallel**
Pattern: `await query1; await query2;` where the two queries are independent (no dependency).
In the 5 most complex route handlers: check if independent queries are `await Promise.all([q1, q2])` or sequential.
Flag: any pair of sequential awaits on independent queries.

---

## Step 5 — Bundle analysis (static, no build required)

Read `next.config.ts`. Check:

**P1 — serverExternalPackages**
Verify that heavy server-only packages are in `serverExternalPackages` (prevents bundling into client):
Expected: `pdfjs-dist`, `pdf-lib`, `docxtemplater`, `pizzip`, `xlsx` — check each is listed.
Flag: any missing package that is clearly server-only but not externalized.

**P2 — Dynamic imports for heavy client libs**
Check if the following are dynamically imported (`dynamic(() => import(...), { ssr: false })`):
- `recharts` / Chart component
- `tiptap` editor (if used in client components)
- `react-day-picker` / Calendar (used inside Popovers)
Flag: heavy libs that are not lazily loaded and appear in the main bundle.

---

## Step 6 — Produce report and update backlog

### Output format

```
## Perf Audit — [DATE]
### Scope: [N] pages + [N] API routes

### Server/Client Boundary
| # | Check | Issues | Verdict |
|---|---|---|---|
| B1 | Unnecessary 'use client' on pages | N | ✅/⚠️ |
| B2 | Heavy lib imports in client components | N | ✅/⚠️ |
| B3 | useEffect data fetching | N | ✅/⚠️ |
| B4 | Missing memoization on list rows | N | ✅/⚠️ |

### Images
| # | Check | Verdict | Notes |
|---|---|---|---|
| I1 | Native img vs next/image | ✅/⚠️ | |
| I2 | Avatar image sizing | ✅/⚠️ | |

### API Query Efficiency
| # | Check | Verdict | Notes |
|---|---|---|---|
| Q1 | Unbounded queries | ✅/⚠️ | |
| Q2 | Column over-fetching | ✅/⚠️ | |
| Q3 | Serial vs parallel awaits | ✅/⚠️ | |

### Bundle
| # | Check | Verdict | Notes |
|---|---|---|---|
| P1 | serverExternalPackages | ✅/⚠️ | |
| P2 | Dynamic imports | ✅/⚠️ | |

### ⚠️ Findings requiring action ([N] total)
[file — issue — estimated impact — fix]
```

### Write to backlog

For each finding with severity Medium or above, append to `docs/backlog-refinement.md`:
- Assign ID: `PERF-[n]`
- Add to priority index
- Add full detail section

### Severity guide
- **High**: unbounded query on a table with 1000+ rows; heavy lib in main client bundle; server-fetched data moved to useEffect (double request, waterfall)
- **Medium**: unnecessary `'use client'` on a page (prevents server-side rendering + increases JS bundle); serial awaits on independent queries; missing serverExternalPackages for a heavy lib
- **Low**: missing memoization on a low-frequency render; minor over-fetching; avatar without explicit dimensions

---

## Execution notes

- Do NOT make any code or config changes.
- Do NOT run `npm run build` or `npx @next/bundle-analyzer` — static analysis only.
- Core Web Vitals, Lighthouse scores, SEO performance, and public indexing metrics are OUT OF SCOPE.
- DB-side missing indexes are OUT OF SCOPE (covered by `/skill-db`).
- After the report, ask: "Vuoi che implementi le ottimizzazioni High identificate?"
