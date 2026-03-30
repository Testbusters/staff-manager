# Design System — Staff Manager

> **Scope**: color tokens, typography, spacing, and Figma foundations.
> For component usage rules see `docs/ui-components.md`.
> For mandatory coding rules (bg-brand, text-link, EmptyState, etc.) see `CLAUDE.md § UI Design System`.
>
> **Live source**: Figma MCP is configured globally. Use `get_variable_defs` on file `p9kUAQ2qNVg4PojTBEkSmC` (Foundation TB) to read current token values directly from Figma. Values in this file are a snapshot — Figma is authoritative.

---

## 1. Semantic tokens (runtime values)

Defined in `app/globals.css` via `@theme inline`. These are the Tailwind class names used in code.

### Color tokens — light / dark resolved values

| Token | Light | Dark | Notes |
|---|---|---|---|
| `background` | `#ffffff` | `--base-950` ≈ `#13111a` | Page background |
| `foreground` | `--base-800` ≈ `#2f2c3a` | `--base-200` ≈ `#e8e6ef` | Body text |
| `card` | `#ffffff` | `--base-900` ≈ `#1e1b27` | Card surface |
| `card-foreground` | `--base-800` | `--base-200` | Text on cards |
| `popover` | `#ffffff` | `--base-900` | Popover surface |
| `muted` | `--base-100` ≈ `#f0eef6` | `--base-800` ≈ `#2f2c3a` | Muted bg (hover, empty states) |
| `muted-foreground` | `--base-500` ≈ `#6b6878` | `--base-400` ≈ `#9896a3` | Secondary text |
| `border` | `--base-200` ≈ `#dddbe6` | `--base-800` | Dividers, input borders |
| `input` | `--base-300` ≈ `#c8c5d3` | `--base-700` ≈ `#413e50` | Input border |
| `ring` | `--base-800` | `--base-500` | Focus ring |
| `primary` | `--base-950` | `--base-50` ≈ `#f8f7fc` | Default button fill |
| `primary-foreground` | `#ffffff` | `--base-900` | Text on primary button |
| `secondary` | `--base-200` | `--base-700` | Secondary button fill |
| `secondary-foreground` | `--base-800` | `--base-200` | Text on secondary |
| `accent` | `--base-200` | `--base-800` | Hover highlight |
| `destructive` | `oklch(0.577 0.245 27.325)` ≈ `#dc2626` | `oklch(0.704 0.191 22.216)` ≈ `#f87171` | Destructive actions |
| `brand` | `oklch(0.546 0.245 262.881)` ≈ `#2563eb` | same | CTA buttons (stable) |
| `brand-foreground` | `#ffffff` | `#ffffff` | Text on brand buttons |
| `link` | `oklch(0.488 0.243 264.376)` ≈ `#1d4ed8` | `oklch(0.707 0.165 254.624)` ≈ `#60a5fa` | Clickable text |
| `info` | same as `link` | same as `link` | Alert info variant |
| `info-foreground` | `#ffffff` | `#0a0a0a` | Text on info bg |

### Sidebar tokens

| Token | Light | Dark |
|---|---|---|
| `sidebar` | `--base-100` | `--base-900` |
| `sidebar-foreground` | `--base-600` | `--base-400` |
| `sidebar-primary` | `--base-950` | `--base-50` |
| `sidebar-accent` | `--base-200` | `--base-800` |
| `sidebar-border` | `--base-200` | `--base-800` |

### Border radius scale

| Token | Value | Tailwind class |
|---|---|---|
| `radius-sm` | `radius - 4px` = `0.25rem` | `rounded-sm` |
| `radius-md` | `radius - 2px` = `0.375rem` | `rounded-md` |
| `radius-lg` | `radius` = `0.625rem` | `rounded-lg` |
| `radius-xl` | `radius + 4px` = `1rem` | `rounded-xl` |
| `radius-2xl` | `radius + 8px` = `1.25rem` | `rounded-2xl` |

---

## 2. Base color scale (`--base-*`)

Warm-neutral gray (hue ~286, slight violet cast). Defined in `app/themes.css`.

| Step | oklch | Approx hex |
|---|---|---|
| 50 | `oklch(0.985 0.0013 286.84)` | `#f8f7fc` |
| 100 | `oklch(0.967 0.0027 286.38)` | `#f0eef6` |
| 200 | `oklch(0.92 0.0053 286.32)` | `#dddbe6` |
| 300 | `oklch(0.871 0.008 286.29)` | `#c8c5d3` |
| 400 | `oklch(0.705 0.012 286.07)` | `#9896a3` |
| 500 | `oklch(0.552 0.016 285.94)` | `#6b6878` |
| 600 | `oklch(0.442 0.0147 285.79)` | `#504d5e` |
| 700 | `oklch(0.37 0.012 285.81)` | `#413e50` |
| 800 | `oklch(0.274 0.008 286.03)` | `#2f2c3a` |
| 900 | `oklch(0.21 0.0053 285.89)` | `#1e1b27` |
| 950 | `oklch(0.141 0.004 285.83)` | `#13111a` |
| 1000 | `oklch(0.096 0.0027 285.79)` | `#0c0a12` |

---

## 3. Foundation TB — General

Source: `Foundation_TB/General.png` (Figma Design System, Testbusters).

### Body (text / icon colors)

| Token | Hex | Usage |
|---|---|---|
| `body-light` | `#FFFFFF` | Labels and icons inside dark interactive elements |
| `body-dark` | `#25273B` | Labels and icons inside light interactive elements |
| `body-gray` | `#606E7C` | Secondary text, descriptions |
| `body-accent` | `#FF5300` | Selected/active interactive elements |

> `body-light-gray` exists in Figma but hex was not legible in the exported PNG.

### Background

| Token | Notes |
|---|---|
| `bg-light` | `#FFFFFF` |
| `bg-gray` | `#F1F1F2` |
| `bg-dark` | `#25273B` / rgb(37, 39, 51) |
| `bg-orange` | Figma card background (hex not legible in export) |

---

## 4. Foundation TB — Status

Source: `Foundation_TB/Status.png`.

### Body (text / icon on status chips)

| Token | Hex | Chip |
|---|---|---|
| `body-status-orange` | `#E77430` | "Da completare" |
| `body-status-blue` | `#3015F9` | "Da iniziare" |
| `body-status-green` | `#36A84F` | "Completata" |

### Background (chip backgrounds)

| Token | Usage |
|---|---|
| `bg-status-orange` | Bg of "Da completare" chip (light orange/peach — hex not legible in export) |
| `bg-status-blue` | Bg of "Da iniziare" chip (very light blue) |
| `bg-status-green` | Bg of "Completata" chip (very light green) |
| `bg-status-gray` | `#FAFAFA` — Bg of Informative/Small/Medium chips |

---

## 5. Foundation TB — Action (buttons & inputs)

Source: `Foundation_TB/Action.png`.

### Body

| Token | Hex | Usage |
|---|---|---|
| `body-light` | `#FFFFFF` | Labels/icons on dark interactive elements |
| `body-dark` | `#25273B` | Labels/icons on light interactive elements |
| `body-primary-disabled` | `#6D6E7C` | Labels/icons on primary-disabled buttons; secondary text |
| `body-secondary-disabled` | `#9E9FA4` | Labels/icons on secondary and tertiary disabled buttons |

### Background

| Token | Hex | Usage |
|---|---|---|
| `bg-primary-default` | `#25273B` | Button primary default; stroke for tertiary-default/hover/pressed |
| `bg-primary-hover` | `#1A1C2A` | Button primary hover |
| `bg-primary-disabled` | `#BBBCC2` | Button primary disabled; stroke for secondary-disabled + tertiary-disabled |
| `bg-secondary-default` | `#E9E9EB` | Button secondary default |
| `bg-secondary-hover` | `#BBBCC2` | Button secondary hover; stroke for secondary-default/hover/pressed |
| `bg-secondary-disabled` | `#FAFAFA` | Button secondary disabled |
| `bg-tertiary-default` | `#FFFFFF` | Button tertiary default |
| `bg-tertiary-hover` | `#E9E9EB` | Button tertiary hover |
| `bg-input-active` | `#FAFAFA` | Input active background |
| `bg-input-disabled` | `#E9E9EB` | Input disabled background |

---

## 6. Foundation TB — Alpha & Gradient

Source: `Foundation_TB/Alpha.png`, `Foundation_TB/Gradient.png`.

| Token | Value | Usage |
|---|---|---|
| `alpha-1` | `#E9E9EB` at 80% opacity | Blur overlay behind pop-ups |
| `gradient-1` | `MED/900` at 10% → `MED/900` at 0% | Blur overlay behind chart areas |

> `gradient-1` uses the MED area token (see Areas section), not a fixed hex.

---

## 7. Foundation TB — Accent

Source: `Foundation_TB/Accent.png`. These are accent colors for Body & Background use.

| Token | Hex | Visual |
|---|---|---|
| `accent-orange` | `#ff3300` | Brand orange (Testbusters primary) |
| `accent-red` | `#ff8060` | Soft red/salmon |
| `accent-pink` | — | Rosa/lavanda (hex errato nel Figma — da correggere alla fonte) |
| `accent-green` | — | Verde teal (hex errato nel Figma — da correggere alla fonte) |
| `accent-blue` | — | Blu chiaro (hex errato nel Figma — da correggere alla fonte) |

---

## 8. Foundation TB — Service (Danger / Warning / Success)

Source: `Foundation_TB/Service.png`. Full 10-step scales for semantic state colors.

### Danger (Red)

| Step | Hex | RGB |
|---|---|---|
| red-50 | `#fae7e8` | 250, 231, 232 |
| red-100 | `#f0b5b7` | 240, 181, 183 |
| red-200 | `#e89194` | 232, 145, 148 |
| red-300 | `#de5f64` | 222, 95, 100 |
| red-400 | `#d84045` | 216, 64, 69 |
| red-500 | `#ce1017` | 206, 16, 23 |
| red-600 | `#bb0f15` | 187, 15, 21 |
| red-700 | `#920b10` | 146, 11, 16 |
| red-800 | `#71090d` | 113, 9, 13 |
| red-900 | `#57070a` | 87, 7, 10 |

### Warning (Yellow)

| Step | Hex | RGB |
|---|---|---|
| yellow-50 | `#FFFAE8` | 255, 250, 232 |
| yellow-100 | `#FFF4CF` | 255, 244, 207 |
| yellow-200 | `#FFEDB2` | 255, 237, 178 |
| yellow-300 | `#FFE387` | 255, 227, 135 |
| yellow-400 | `#FFD753` | 255, 215, 83 |
| yellow-500 | `#FFC300` | 255, 195, 0 |
| yellow-600 | `#EBB400` | 235, 180, 0 |
| yellow-700 | `#C29500` | 194, 149, 0 |
| yellow-800 | `#876800` | 135, 104, 0 |
| yellow-900 | `#5E4800` | 94, 72, 0 |

### Success (Green)

| Step | Hex | RGB |
|---|---|---|
| green-50 | `#ebf5f2` | 235, 245, 242 |
| green-100 | `#c0e0d8` | 192, 224, 216 |
| green-200 | `#a2d1c5` | 162, 209, 197 |
| green-300 | `#7bbdab` | 120, 189, 171 |
| green-400 | `#5db09a` | 93, 176, 154 |
| green-500 | `#359c81` | 53, 156, 129 |
| green-600 | `#308e75` | 48, 142, 117 |
| green-700 | `#266f5c` | 38, 111, 92 |
| green-800 | `#1d5647` | 29, 86, 71 |
| green-900 | `#164236` | 22, 66, 54 |

---

## 9. Foundation TB — Areas (accent per service area)

Source: `Foundation_TB/Areas.png`. Each area has: `Text/900` + `Background/900` + `Background/600` + `Background/50` (last 3 have only 900).

Hex values not legible in the exported PNGs. **For code use `lib/content-badge-maps.ts`** — it is the authoritative source for area badge colors. Do not define new hex values here until the Figma source is corrected.

| Area | Color family |
|---|---|
| MED | Red-orange vivid |
| PSAN | Amber/golden orange |
| PVT | Pink/magenta |
| IMAT | Purple/plum |
| Bocconi | Navy blue/indigo |
| TOLC-SU | Medium purple |
| TOLC-PSI | Vivid pink |
| TOLC-I | Teal/cyan |
| TOLC-E | Steel blue |
| TOLC-B-S-F-AV | Dark teal |
| DESIGN | Lime green |
| ARCHED | Teal green |
| FP | Salmon/red |
| TOLC-LP | Blue-gray |
| Test SSM–P4M | Dark navy |
| Uniadmissions | Blue (900 only) |
| Ammesso | Teal blue (900 only) |
| Studybusters | Red/coral (900 only) |

---

## 10. Status badge mapping

For the authoritative implementation (actual Tailwind classes, variant names, e2e selectors) see `docs/ui-components.md § Badge — Mapping stato → variante`. That file is the single source of truth for badge code.

Figma intent (Foundation TB Status) → implementation mapping:
- `body-status-orange` / `bg-status-orange` → `IN_ATTESA` badge
- `body-status-green` / `bg-status-green` → `APPROVATO` / `FIRMATO` badge
- `body-status-blue` / `bg-status-blue` → `LIQUIDATO` badge
- Danger red scale → `RIFIUTATO` badge

---

## 11. Typography

Fonts loaded via Next.js `next/font/google` in `app/layout.tsx`.

| Role | Font | Token |
|---|---|---|
| Interface / body | Geist Sans | `--font-geist-sans` → `font-sans` |
| Monospace / code | Geist Mono | `--font-geist-mono` → `font-mono` |

> Figma uses Manrope (headlines) + Inter (body). The app uses Geist Sans as the unified interface font. Manrope/Inter are Figma design references, not loaded in the app.

---

## 12. Key usage rules (quick reference)

Full rules in `CLAUDE.md § UI Design System — MANDATORY RULES`. Summary:

- **Primary CTA button**: `bg-brand hover:bg-brand/90 text-white` — never `bg-blue-*`
- **Link text**: `text-link hover:text-link/80` — never `text-blue-400`
- **Row hover**: `hover:bg-muted/60` — never lower opacity
- **Empty states**: `<EmptyState>` component — never bare `<p className="text-center">`
- **Semantic tokens only** on structural elements — no hardcoded `gray-*/slate-*/zinc-*`
- **Both themes**: verify every new element in light and dark mode before committing
