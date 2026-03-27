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

## shadcn Component Patterns
- **Dialog**: `onOpenChange(false)` fires for both X and Esc — always reset form state there. Built-in X button at `absolute top-4 right-4` — add `pr-10` to custom headers to avoid overlap. `showCloseButton={false}` to suppress it.
- **Tooltip**: `<TooltipProvider delayDuration={300}>` wraps `app/(app)/layout.tsx`. Radix portal means `overflow-hidden` on parent containers no longer clips the tooltip.
- **Nav icons across Server/Client boundary**: `lib/nav.ts` uses `iconName: string` (plain, serializable). `Sidebar.tsx` resolves icons via `ICON_MAP`. Never put Lucide icon components in data structures passed from Server to Client Components.

## Table Layout Rules (PERMANENT)
- **Dedicated pages**: `<Table className="w-auto">` inside `<div className="w-fit ... overflow-hidden">`. Card snaps to table content — row hover does NOT bleed right. Never `w-full` on table or card wrapper. Dashboard widgets exempt.
- **Multiple tables on same page**: all cards share the width of the widest table — add `min-w-[Xpx]` to narrower cards so columns align vertically. Confirmed 2026-03-25.
- **Multi-group alignment**: separate `<Table>` elements cannot share column widths. Use a single `<Table>` with section header rows (`<TableRow><TableCell colSpan={N}>`) for aligned columns across groups. Example: `DocumentList.tsx` (CONTRATTO/CU/RICEVUTA sections).

## Theme + Hydration
- **next-themes**: `defaultTheme="dark"`, `enableSystem=false`. Theme stored in `user_profiles.theme_preference`, synced on mount. Login page always forces dark.
- **`suppressHydrationWarning`**: required on `<html>`, `<body>`, and any element reading `resolvedTheme` before mount.
- **Tiptap 3 SSR**: always add `immediatelyRender: false` to `useEditor()` — without it Next.js hydration throws even in `'use client'` components.
