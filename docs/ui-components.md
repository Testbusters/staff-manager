# UI Components — Reference

> Permanent file. Do not delete.
> Update every time a new UI pattern is introduced or adopted.

---

## Component Map

Before writing native HTML (`<button>`, `<input>`, `<select>`, `<div>` as modal, etc.),
check whether a mapped component exists here.

| UI Need | Component | File | Status |
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
| Tabella dati con filtri/sort | `DataTable` | `components/ui/data-table.tsx` | ✅ Disponibile |
| Form con validazione | `Form` + `FormField` | `components/ui/form.tsx` | ✅ Disponibile |
| Selettore data | `Calendar` | `components/ui/calendar.tsx` | ✅ Disponibile |
| Grafici | `ChartContainer` + primitives | `components/ui/chart.tsx` | ✅ Disponibile |

---

## Badge — Mapping stato → variante

### Compensations / Expenses

| Stato | Variante | className extra |
|---|---|---|
| `IN_ATTESA` | `outline` | `border-amber-600 text-amber-400` |
| `APPROVATO` | `outline` | `border-green-600 text-green-400` |
| `RIFIUTATO` | `destructive` | — |
| `LIQUIDATO` | `outline` | `bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300` |

### Documents

| Stato | Variante | className extra |
|---|---|---|
| `DA_FIRMARE` | `outline` | `border-amber-600 text-amber-400` |
| `FIRMATO` | `outline` | `border-green-600 text-green-400` |

### Tickets

| Stato | Variante | className extra |
|---|---|---|
| `APERTO` | `outline` | `bg-muted text-foreground border-border` |
| `IN_LAVORAZIONE` | `outline` | `border-amber-600 text-amber-400` |
| `CHIUSO` | `secondary` | — |

**Implementazione**: `components/compensation/StatusBadge.tsx` (compensation/expense),
`components/ticket/TicketStatusBadge.tsx` (ticket).

---

## Status Color System

Applies to non-badge status UI: alert boxes, info panels, confirmation labels, inline warnings.
Use these pairings consistently — never invent new color combos for semantic states.

| Semantic | bg light | bg dark | border light | border dark | text light | text dark |
|---|---|---|---|---|---|---|
| Success / confirmed | `bg-green-50` | `dark:bg-green-900/20` | `border-green-200` | `dark:border-green-700/40` | `text-green-700` | `dark:text-green-400` |
| Warning / pending | `bg-yellow-50` | `dark:bg-yellow-900/20` | `border-yellow-200` | `dark:border-yellow-800/40` | `text-yellow-800` | `dark:text-yellow-200` |
| Danger / error | `bg-red-50` | `dark:bg-red-900/30` | `border-red-200` | `dark:border-red-800/40` | `text-red-700` | `dark:text-red-400` |
| Info / neutral | `bg-muted/60` | `dark:bg-muted/60` | `border-border` | `border-border` | `text-foreground` | `text-foreground` |

**Row-level action buttons** (appearing on every row of a list/table): always `<Button variant="outline" size="sm">`.
- For semantic intent, add text color only: e.g. `className="text-green-700 dark:text-green-400 hover:text-green-700 dark:hover:text-green-400"`.
- Never apply filled color backgrounds (`bg-green-50`, `bg-red-50`) on row-level buttons — reserve those for alert panels.

**Interactive labels** (checkbox/radio with `cursor-pointer`): always add a hover state so the element signals interactivity.
- Standard: `hover:bg-muted/60 rounded transition`
- Status-specific: match the semantic background, e.g. `hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition` for a yellow confirmation panel.

---

## Dialog / Sheet — Pattern

```tsx
// Dialog — modal centrato
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

<Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); resetState(); } }}>
  <DialogContent className="max-w-md bg-card border-border">
    <DialogHeader>
      <DialogTitle className="text-base font-semibold text-foreground">Titolo</DialogTitle>
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
  <SheetContent side="right" className="w-full max-w-lg bg-card border-l border-border p-0 flex flex-col sm:max-w-lg">
    <SheetHeader className="px-6 py-5 border-b border-border flex-shrink-0 space-y-0">
      <SheetTitle className="text-base font-semibold text-foreground">Titolo</SheetTitle>
    </SheetHeader>
    <div className="flex-1 overflow-y-auto px-6 py-4">{/* content */}</div>
  </SheetContent>
</Sheet>
```

**Key rules:**
- `onOpenChange(false)` fires on X click and Esc — always reset form state there
- Built-in X button positioned `absolute top-4 right-4` — add `pr-10` to custom headers to avoid overlap
- `showCloseButton={false}` on `DialogContent` to suppress the built-in X
- For scrollable body: `p-0 gap-0` on DialogContent + manual padding on children
- Sheet: `sm:max-w-lg` overrides the default `sm:max-w-sm`

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

**Note:** Radix Tooltip uses a portal — `overflow-hidden` on parent containers no longer clips the tooltip.

---

## Selettori e2e — Strategia

e2e tests must use `data-*` attributes, not CSS color classes.
Color classes change across migration phases — `data-*` attributes are stable.

| Target | Selettore | Note |
|---|---|---|
| Badge compensation/expense | `[data-stato="APPROVATO"]` | `data-stato={stato}` presente in `StatusBadge.tsx` |
| Badge ticket | `[data-ticket-stato="CHIUSO"]` | Già presente in `TicketStatusBadge` |
| Dialog overlay | `[data-slot="dialog-overlay"]` | Radix data-slot attribute |
| Dialog content | `[data-slot="dialog-content"]` | Per scoping selettori dentro modal |
| Badge generico | `[data-slot="badge"]` | Tutti i Badge shadcn |

**Never use** `span.text-{color}` for status badges — Badge renders `<div>`, not `<span>`.

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

<div className="rounded-xl bg-card border border-border overflow-hidden">
  <Table>
    <TableHeader>
      <TableRow className="border-border">
        <TableHead className="px-4 py-3 text-xs text-muted-foreground">Column</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow className="cursor-pointer hover:bg-muted/60 border-border">
        <TableCell className="px-4 py-3">value</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

**Note:** `Table` renders as `<div><table>` — wrap in outer `div.rounded-xl` for styled container. Pass `className="px-4 py-3"` to cells to override default `p-4`.

---

## Theme system — Technical notes

The project supports light/dark mode via `next-themes` (ThemeProvider in `app/layout.tsx`).
- Default: `dark`. Toggle in Sidebar for every role.
- Login page: always dark (via `useEffect(() => setTheme('dark'), [setTheme])`).
- Persistence: `user_profiles.theme_preference` (migration 035). Synced via `ThemeSync.tsx` on mount.
- Toggle API: `PATCH /api/profile/theme` (fire-and-forget, `{ theme: 'light' | 'dark' }`).
- `suppressHydrationWarning` required on `<html>` and on elements reading `resolvedTheme`.

---

## Technical notes: shadcn components

**`components/ui/` files that must NOT be overwritten by `npx shadcn add`:**
- `CopyButton.tsx`
- `RichTextDisplay.tsx`
- `RichTextEditor.tsx`
- `InfoTooltip.tsx` — wrapper over shadcn Tooltip, keep for backward compat
- shadcn uses `dark:` variants — they work because the `dark` class is always present
- CSS custom properties in `:root` apply only if not overridden by `.dark`
- After every `npx shadcn add`, verify that `.dark` variables are correct

---

## DataTable — Pattern

```tsx
import { DataTable, DataTableColumnHeader, type ColumnDef } from '@/components/ui/data-table';

// 1. Define columns
const columns: ColumnDef<MyRow>[] = [
  {
    accessorKey: "nome",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nome" />,
    cell: ({ row }) => <span>{row.getValue("nome")}</span>,
  },
  {
    accessorKey: "importo",
    header: "Importo",
    cell: ({ row }) => formatImporto(row.getValue("importo")),
  },
];

// 2. Use DataTable
<div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
  <DataTable
    columns={columns}
    data={rows}
    pagination          // optional: enables prev/next controls
    pageSize={20}       // default: 20
    emptyMessage="Nessun risultato."
  />
</div>
```

**Note:** `DataTableColumnHeader` adds sort toggle (chevron icons). Wraps existing `Table` primitives — outer styled div still needed for rounded/border.

---

## Form — Pattern

```tsx
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
  useForm, zodResolver,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { z } from 'zod';

const schema = z.object({
  nome: z.string().min(1, 'Campo obbligatorio'),
  importo: z.coerce.number().positive(),
});

export function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { nome: '', importo: 0 },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    // data is typed and validated
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />  {/* shows validation error */}
            </FormItem>
          )}
        />
        <Button type="submit">Salva</Button>
      </form>
    </Form>
  );
}
```

**Note:** `useForm` and `zodResolver` are re-exported from `form.tsx` for convenience. Use for NEW forms — existing forms use manual useState pattern (migration not required).

---

## Calendar — Pattern

```tsx
import { Calendar } from '@/components/ui/calendar';

const [date, setDate] = React.useState<Date | undefined>();

<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
  className="rounded-md border"
/>
```

**Note:** react-day-picker v9. Supports `mode="single"`, `mode="range"`, `mode="multiple"`.

---

## Chart — Pattern

```tsx
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, XAxis } from 'recharts';

const config: ChartConfig = {
  importo: { label: 'Importo', color: 'hsl(var(--chart-1))' },
};

<ChartContainer config={config} className="h-[200px]">
  <BarChart data={data}>
    <XAxis dataKey="mese" />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Bar dataKey="importo" fill="var(--color-importo)" />
  </BarChart>
</ChartContainer>
```

**Note:** recharts v3. `ChartContainer` injects CSS variables `--color-{key}` from config. Use `var(--color-key)` as fill/stroke values. Existing `DashboardBarChart` and `AdminDashboard` use recharts directly — no migration required.

---

## Future components roadmap

All core components are now available. Add new components here on demand.
