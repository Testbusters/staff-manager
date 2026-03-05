# UI Components — Reference

> File permanente. Non eliminare.
> Aggiornare ogni volta che viene introdotto o adottato un nuovo pattern UI.

---

## Component Map

Prima di scrivere HTML nativo (`<button>`, `<input>`, `<select>`, `<div>` come modal, ecc.),
verificare se esiste un componente mappato qui.

| Esigenza UI | Componente | File | Stato |
|---|---|---|---|
| Modal centrato / conferma | `Dialog` | `components/ui/dialog.tsx` | ✅ Disponibile |
| Conferma distruttiva | `AlertDialog` | `components/ui/alert-dialog.tsx` | ✅ Disponibile |
| Pannello laterale / form lungo | `Sheet` (`side="right"`) | `components/ui/sheet.tsx` | ✅ Disponibile |
| Tooltip informativo | `Tooltip` + `TooltipProvider` | `components/ui/tooltip.tsx` | ✅ Disponibile |
| Status label / badge | `Badge` + varianti custom | `components/ui/badge.tsx` | ✅ Disponibile |
| Bottone azione | `Button` | `components/ui/button.tsx` | ✅ Disponibile |
| Input testo | `Input` | `components/ui/input.tsx` | ✅ Disponibile |
| Area di testo | `Textarea` | `components/ui/textarea.tsx` | ✅ Disponibile |
| Select / dropdown | `Select` | `components/ui/select.tsx` | ✅ Disponibile |
| Menu azioni contestuale | `DropdownMenu` | `components/ui/dropdown-menu.tsx` | ✅ Disponibile |
| Tab navigation | `Tabs` | `components/ui/tabs.tsx` | ✅ Disponibile |
| Paginazione prev/next | `Pagination` | `components/ui/pagination.tsx` | ✅ Disponibile |
| Tabella strutturata | `Table` | `components/ui/table.tsx` | ✅ Disponibile |
| Card container | `Card` | `components/ui/card.tsx` | ✅ Disponibile |
| Checkbox selezione | `Checkbox` | `components/ui/checkbox.tsx` | ✅ Disponibile |
| Avatar utente | `Avatar` | `components/ui/avatar.tsx` | ✅ Disponibile |
| Separatore visivo | `Separator` | `components/ui/separator.tsx` | ✅ Disponibile |
| Skeleton loading | `Skeleton` | `components/ui/skeleton.tsx` | ✅ Disponibile |
| Tabella dati con filtri | `DataTable` (TanStack + `Table`) | — | On demand (Wave 2) |

---

## Badge — Mapping stato → variante

### Compensations / Expenses

| Stato | Variante | className extra |
|---|---|---|
| `IN_ATTESA` | `outline` | `border-amber-600 text-amber-400` |
| `APPROVATO` | `outline` | `border-green-600 text-green-400` |
| `RIFIUTATO` | `destructive` | — |
| `LIQUIDATO` | `outline` | `border-blue-600 text-blue-400` |

### Documents

| Stato | Variante | className extra |
|---|---|---|
| `DA_FIRMARE` | `outline` | `border-amber-600 text-amber-400` |
| `FIRMATO` | `outline` | `border-green-600 text-green-400` |

### Tickets

| Stato | Variante | className extra |
|---|---|---|
| `APERTO` | `outline` | `border-blue-600 text-blue-400` |
| `IN_LAVORAZIONE` | `outline` | `border-amber-600 text-amber-400` |
| `CHIUSO` | `secondary` | — |

**Implementazione**: `components/compensation/StatusBadge.tsx` (compensation/expense),
`components/ticket/TicketStatusBadge.tsx` (ticket).

---

## Dialog / Sheet — Pattern

```tsx
// Dialog — modal centrato
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

<Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); resetState(); } }}>
  <DialogContent className="max-w-md bg-gray-900 border-gray-800">
    <DialogHeader>
      <DialogTitle className="text-base font-semibold text-gray-100">Titolo</DialogTitle>
    </DialogHeader>
    {/* body */}
    <div className="flex gap-3 justify-end">
      <button onClick={() => { setOpen(false); resetState(); }}>Annulla</button>
      <button onClick={handleConfirm}>Conferma</button>
    </div>
  </DialogContent>
</Dialog>

// Sheet — pannello laterale
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

<Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
  <SheetContent side="right" className="w-full max-w-lg bg-gray-900 border-l border-gray-800 p-0 flex flex-col sm:max-w-lg">
    <SheetHeader className="px-6 py-5 border-b border-gray-800 flex-shrink-0 space-y-0">
      <SheetTitle className="text-base font-semibold text-gray-100">Titolo</SheetTitle>
    </SheetHeader>
    <div className="flex-1 overflow-y-auto px-6 py-4">{/* content */}</div>
  </SheetContent>
</Sheet>
```

**Regole chiave:**
- `onOpenChange(false)` si attiva per click su X e per Esc — resettare sempre lo stato form lì
- X button built-in posizionato `absolute top-4 right-4` — aggiungere `pr-10` agli header custom per evitare sovrapposizione
- `showCloseButton={false}` su `DialogContent` per sopprimere la X built-in
- Per body scrollabile: `p-0 gap-0` su DialogContent + padding manuale sui figli
- Sheet: `sm:max-w-lg` sovrascrive il default `sm:max-w-sm`

---

## Tooltip — Pattern

```tsx
// TooltipProvider in app/(app)/layout.tsx (già presente)
import { TooltipProvider } from '@/components/ui/tooltip';
<TooltipProvider delayDuration={300}>{children}</TooltipProvider>

// Uso nei componenti
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
// Oppure via wrapper:
import { InfoTooltip } from '@/components/ui/InfoTooltip';
<InfoTooltip tip="testo del tooltip" />
```

**Note:** Radix Tooltip usa un portale — `overflow-hidden` sui container padre non clippa più il tooltip.

---

## Selettori e2e — Strategia

I test e2e devono usare `data-*` attribute, non classi CSS colore.
Le classi colore cambiano con le fasi di migrazione — i `data-*` sono stabili.

| Target | Selettore | Note |
|---|---|---|
| Badge compensation/expense | `[data-stato="APPROVATO"]` | `data-stato={stato}` presente in `StatusBadge.tsx` |
| Badge ticket | `[data-ticket-stato="CHIUSO"]` | Già presente in `TicketStatusBadge` |
| Dialog overlay | `[data-slot="dialog-overlay"]` | Radix data-slot attribute |
| Dialog content | `[data-slot="dialog-content"]` | Per scoping selettori dentro modal |
| Badge generico | `[data-slot="badge"]` | Tutti i Badge shadcn |

**Mai usare** `span.text-{color}` per status badge — Badge renderizza `<div>`, non `<span>`.

---

## Tabs — Pattern

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Default variant (pill buttons)
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">...</TabsContent>
  <TabsContent value="tab2">...</TabsContent>
</Tabs>

// Line variant (underline)
<TabsList variant="line">
  <TabsTrigger value="tab1">Tab 1</TabsTrigger>
</TabsList>

// Custom styling (dark app, override muted bg)
<TabsList className="h-auto bg-transparent p-0 gap-1">
  <TabsTrigger
    value="tab1"
    className="group ... data-[state=active]:bg-gray-800 data-[state=active]:text-gray-100 ..."
  >
    Label
    {/* Badge that reacts to active state via group variant */}
    <span className="bg-gray-700 text-gray-400 group-data-[state=active]:bg-blue-600 group-data-[state=active]:text-white ...">
      {count}
    </span>
  </TabsTrigger>
</TabsList>
```

**Note:** For count badges inside TabsTrigger, add `group` to TabsTrigger className and use `group-data-[state=active]:*` on child spans.

---

## DropdownMenu — Pattern

```tsx
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost">Actions</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={handleEdit}>Modifica</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive" onClick={handleDelete}>Elimina</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Note:** Content renders via Radix portal — not clipped by `overflow-hidden` ancestors. For rich custom panels (NotificationBell), use `DropdownMenuContent` with custom HTML inside (no `DropdownMenuItem`). Pass `className="p-0 ..."` to remove default padding.

---

## Avatar — Pattern

```tsx
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

<Avatar className="w-7 h-7">  {/* override default size-8 */}
  <AvatarImage src={avatarUrl ?? undefined} alt="" />
  <AvatarFallback className="bg-gray-700 text-xs text-gray-300">
    {name.charAt(0).toUpperCase()}
  </AvatarFallback>
</Avatar>
```

---

## Table — Pattern

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

<div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
  <Table>
    <TableHeader>
      <TableRow className="border-gray-800">
        <TableHead className="px-4 py-3 text-xs text-gray-500">Column</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow className="cursor-pointer hover:bg-gray-800/50 border-gray-800">
        <TableCell className="px-4 py-3">value</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

**Note:** `Table` renders as `<div><table>` — wrap in outer `div.rounded-xl` for styled container. Pass `className="px-4 py-3"` to cells to override default `p-4`.

---

## Theme system — Note tecniche

Il progetto supporta light/dark mode via `next-themes` (ThemeProvider in `app/layout.tsx`).
- Default: `light`. Toggle in Sidebar per ogni ruolo.
- Login page: sempre light (via `useEffect(() => setTheme('light'), [setTheme])`).
- Persistenza: `user_profiles.theme_preference` (migration 035). Sync via `ThemeSync.tsx` al mount.
- Toggle API: `PATCH /api/profile/theme` (fire-and-forget, `{ theme: 'light' | 'dark' }`).
- `suppressHydrationWarning` necessario su `<html>` e su elementi che leggono `resolvedTheme`.

---

## Note tecniche: shadcn components

**Componenti `components/ui/` da NON sovrascrivere con `npx shadcn add`:**
- `CopyButton.tsx`
- `RichTextDisplay.tsx`
- `RichTextEditor.tsx`
- `InfoTooltip.tsx` — wrapper su shadcn Tooltip, da mantenere per backward compat
- shadcn usa `dark:` variants — funzionano perché la classe `dark` è sempre presente
- I CSS custom properties in `:root` valgono solo se non sovrascritti da `.dark`
- Verificare dopo ogni `npx shadcn add` che le variabili in `.dark` siano corrette

**Componenti `components/ui/` da NON sovrascrivere con `npx shadcn add`:**
- `CopyButton.tsx`
- `RichTextDisplay.tsx`
- `RichTextEditor.tsx`
- `InfoTooltip.tsx` — wrapper su shadcn Tooltip, da mantenere per backward compat

---

## Roadmap componenti futuri

| Componente | Priorità |
|---|---|
| `DataTable` (TanStack) | Wave 2 — richiede `@tanstack/react-table` |
| `Form` (react-hook-form) | Wave 2 — richiede `react-hook-form` |
| `Calendar` | On demand — richiede `react-day-picker` |
