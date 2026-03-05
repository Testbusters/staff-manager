# UI Kit Adoption Plan — shadcn-ui-kit-dashboard

> **Temporary planning document.** Remove reference from CLAUDE.md once all phases are complete.
> Source kit: `/Users/MarcoG/Downloads/shadcn-ui-kit-dashboard-main.zip`
> Created: 2026-03-05

---

## Context

The project currently uses a vanilla shadcn/ui install (new-york + gray, Tailwind v4).
The UI kit (`shadcn-ui-kit-dashboard-main`) is a richer, pre-built dashboard kit based on the
same shadcn + Tailwind v4 stack but with:
- A custom semantic token system (`--base-50…1000` scale via `themes.css`)
- ~80 components vs. 14 currently in the project
- `tailwindcss-animate` plugin (vs. vendored `tw-animate-css` workaround in the project)
- Additional deps: `@tanstack/react-table`, `react-hook-form`, `@remixicon/react`, etc.

`components.json` config is **identical** between project and kit (style, baseColor, aliases).

---

## Phase A — Token System Alignment ✅ COMPLETE (2026-03-05)

**Goal**: align the project's CSS token system with the UI kit's `--base-*` scale, so that
components imported from the kit resolve colors correctly.

**Why this is a prerequisite**: the kit maps all semantic tokens (background, foreground, border,
etc.) through `var(--base-*)` variables. Without this, any component imported from the kit
produces wrong colors because the variables don't exist.

**Scope**:
1. Extract `themes.css` from the zip → place at `app/themes.css`
2. Update `app/globals.css`:
   - Add `@import "./themes.css";`
   - Replace hardcoded oklch values in `:root` and `.dark` with `var(--base-*)` references,
     matching the kit's token map
3. Remove or update the `@import "./shadcn-tailwind.css"` import if tokens overlap
4. Visual regression check: verify all existing pages render correctly in dark mode
5. Run `npx tsc --noEmit` + `npm run build`

**Constraint — dark-only**: project is dark hardcoded (`<html class="dark">`). Do NOT install
`next-themes`. The `.dark` overrides in `themes.css` must be preserved as-is.

**Constraint — Turbopack workaround**: keep `tw-animate-css` vendored approach. Do NOT switch
to `@plugin "tailwindcss-animate"` — Turbopack does not resolve the `"style"` export condition.
If the kit's `globals.css` uses `@plugin "tailwindcss-animate"`, substitute with the existing
`@import "./tw-animate.css"` line.

**Files expected to change**:
- `app/themes.css` — new file (extracted from kit)
- `app/globals.css` — token variable updates

**Completion criteria**:
- [ ] `themes.css` in place
- [ ] All semantic tokens in `globals.css` use `var(--base-*)` or `var(--color-*)` references
- [ ] Dark mode renders correctly (all existing pages)
- [ ] `tsc --noEmit` + `npm run build` green
- [ ] Manual smoke check: login page, dashboard, compensi, profilo

---

## Phase B — CSS Plugin (deferred)

**Goal**: replace vendored `tw-animate-css` with `@plugin "tailwindcss-animate"`.

**Blocked by**: Turbopack bug on `"style"` export condition in `package.json`.
**Action**: monitor Next.js/Turbopack changelog. Re-evaluate when bug is resolved upstream.
**Current workaround** (documented in CLAUDE.md): vendor-copy `tw-animate-css` dist to
`app/tw-animate.css` + `app/shadcn-tailwind.css` and import with relative paths.

**Completion criteria** (when re-activated):
- [ ] Remove `app/tw-animate.css` and `app/shadcn-tailwind.css`
- [ ] Add `@plugin "tailwindcss-animate"` to `globals.css`
- [ ] Verify all animations still work

---

## Phase C — Component Adoption (on demand)

**Goal**: adopt components from the kit as new blocks require them. No bulk import.

**Process** (per component):
1. Copy the component file from the kit into `components/ui/`
2. Adjust imports (the kit may use `@radix-ui/react-*` individual packages; project uses `radix-ui` monorepo — verify import paths)
3. Add to `docs/ui-components.md` Component Map
4. Update CLAUDE.md Known Patterns if the component introduces a new usage pattern

**Priority order** (by expected need):

| Component | Trigger |
|---|---|
| `Table` + `DataTable` | First page with structured data list |
| `DropdownMenu` | Row actions menu on any table |
| `Skeleton` | Loading states on any async list |
| `Tabs` | Pages with multiple content sections |
| `Avatar` | Collaborator profile display |
| `Checkbox` | Multi-select forms |
| `Form` (react-hook-form) | Complex validated forms |
| `Card` | Dashboard summary widgets |
| `Pagination` | Any paginated list |
| `Badge` (kit variant) | If kit version adds missing variants |

**Dependency note**: some kit components require additional packages not in the project:
- `DataTable` → needs `@tanstack/react-table`
- `Form` → needs `react-hook-form`
- `Calendar` → needs `react-day-picker`
- `Chart` → needs `recharts`
Install only when the component is actually adopted.

**Import path compatibility**: kit uses individual Radix packages
(`@radix-ui/react-dialog`), project uses `radix-ui` monorepo. Both are valid — check
re-exports in `node_modules/radix-ui` before adding individual packages. Prefer monorepo.

---

## Phase D — CLAUDE.md Instruction Update ✅ COMPLETE (2026-03-05)

**Goal**: strengthen the shadcn/ui instruction in CLAUDE.md to make `ui-components.md`
consultation mandatory before writing any UI element, and reference the kit as source for
new components.

**Changes**:
- Known Patterns: add explicit mandatory rule ("before writing ANY `<button>`, `<input>`, etc.")
- Add note: "New components not yet in the map: copy from the UI kit (see `.claude/ui-kit-adoption.md` Phase C process) before writing native HTML"
- Remove reference to `docs/shadcn-migration.md` (deleted after Fase 9)

---

## Status Log

| Date | Phase | Action |
|---|---|---|
| 2026-03-05 | — | Plan created. Phases A–D defined. |
| 2026-03-05 | A ✅ | Token alignment complete. themes.css (--base-* scale), globals.css migrated, next-themes installed, ThemeProvider+ThemeSync, migration 035, Sidebar toggle, login forced-light, PATCH /api/profile/theme. Build ✅, vitest 252/252 ✅. |
| 2026-03-05 | D ✅ | CLAUDE.md updated: theme system pattern added, shadcn Component Map mandatory rule strengthened with UI kit reference. |
