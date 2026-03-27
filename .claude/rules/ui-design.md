# UI Design System — Full Rules

Reference file delegated from CLAUDE.md. Applies to every block that touches UI.
Non-compliance must be caught in Phase 2 self-review before committing.

## Verification gate
Before closing any phase step, ask "Would a staff engineer approve this?"
Run `npx tsc --noEmit` + affected Playwright specs. No passing checks = not done.

## Token system (Tailwind v4, `app/globals.css` + `app/themes.css`)
For color token values (light/dark resolved), base scale, and Figma Foundation: read `@docs/design-system.md`.

- **Primary action buttons**: always `bg-brand hover:bg-brand/90 text-white`. Never `bg-blue-*` on interactive elements.
- **Row-level / inline buttons** (appearing on every row of a table or list): use `variant="outline"` — applying `bg-brand` on every row creates an alarming visual effect. Reserve `bg-brand` for page-level primary CTAs (submit, confirm, save).
- **Link-style text**: always `text-link hover:text-link/80`. Never `text-blue-400 hover:text-blue-300` or similar hardcoded pairs.
- **List row hover**: `hover:bg-muted/60`. Never `hover:bg-muted/50` or lower.
- **Semantic tokens only** for backgrounds, borders, text: `bg-card`, `bg-muted`, `bg-background`, `border-border`, `text-foreground`, `text-muted-foreground`. Hardcoded gray/slate/zinc scales are only allowed for semantic-badge colors (e.g. `bg-green-100 text-green-700`).
- **Never use non-existent Tailwind classes** like `bg-gray-850` (no 850 step). The valid gray scale ends at 950.
- **Light/dark theme**: every new UI element must render correctly in both themes. Verification is part of Phase 5c smoke test — run once in each mode using the sidebar theme toggle. Semantic tokens (`bg-card`, `text-foreground`, etc.) are the primary protection — hardcoded color values on structural elements will break one of the two themes.

## Components + Empty States + Skeleton
MANDATORY: before writing any `<button>`, `<input>`, `<select>`, `<textarea>`, or modal/backdrop — read `@docs/ui-components.md` for the Component Map, Badge mapping, Dialog/Sheet/Tooltip patterns, empty state rules, skeleton loading requirements, and e2e selector guide.

For components not yet in the map: query the **shadcn MCP** (`npx shadcn@latest mcp` — configured globally as stdio) for up-to-date component docs and props before writing native HTML.

## Accessibility
- Icon-only buttons: always add `aria-label="..."`.
- Pagination `‹`/`›` buttons: always `aria-label="Pagina precedente"` / `aria-label="Pagina successiva"`.
- Interactive `<div>` with onClick: convert to `<button>` or add `role="button" tabIndex={0} onKeyDown`.
