## Block checklist — [Block Name]

### Build & Test
- [ ] tsc --noEmit: 0 errors
- [ ] npm run build: success
- [ ] Vitest unit: N/N passed
- [ ] Vitest API: N/N passed *(if Phase 3b executed)*
- [ ] Playwright e2e: N/N passed *(⏸ suspended if CLAUDE.local.md active)*
- [ ] Visual baseline + axe-core: passed *(if Phase 4b executed)*
- [ ] ui-audit: no Critical issues *(if Track A)*
- [ ] visual-audit: no Critical issues *(if Track A)*
- [ ] ux-audit: no Critical issues *(if Track A)*
- [ ] responsive-audit: PASS *(if collab/responsabile routes modified)*
- [ ] security-audit: no Critical/High issues *(if Track B — block adds/modifies API routes)*
- [ ] api-design: no High issues *(if Track B — block adds new API routes)*
- [ ] skill-db: no Critical/High issues *(if Track B — block applies migrations)*
- [ ] Medium/Minor findings from all audits appended to `docs/refactoring-backlog.md`
- [ ] docs/sitemap.md updated — routes, roles, Componenti chiave, loading.tsx *(if block adds/removes routes or changes role access)*
- [ ] docs/db-map.md updated + `node scripts/refresh-db-map.mjs` run *(if block applies migrations)*

### UI Design System compliance *(skip if block has no UI changes)*
- [ ] No hardcoded `bg-blue-*` on interactive elements (use `bg-brand hover:bg-brand/90`)
- [ ] No hardcoded `text-blue-*` link pairs (use `text-link hover:text-link/80`)
- [ ] Empty states use `<EmptyState>` component, not bare `<p>`
- [ ] New page routes have a `loading.tsx` with Skeleton placeholders
- [ ] Icon-only buttons have `aria-label`
- [ ] No Lucide icon components in Server→Client data props (use `iconName: string`)
- [ ] New UI verified in both light and dark mode (sidebar theme toggle)

### Implemented features
- [ ] [feature 1]: [outcome]

### Manual verification
Steps to verify manually with the appropriate test account:
1. [step]

### SQL verification queries
SELECT …;

### Created / modified files
- path/to/file.ts — description
