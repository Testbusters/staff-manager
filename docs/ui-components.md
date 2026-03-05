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
| Menu azioni contestuale | `DropdownMenu` | — | Futura |
| Tab navigation | `Tabs` | — | Futura |
| Paginazione | `Pagination` | — | Futura |
| Tabella dati (nuove pagine) | `DataTable` (TanStack + `Table`) | — | On demand |
| Loading state | `Skeleton` | — | Futura |

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

## Dark-only — Note tecniche

Il progetto è dark-only hardcoded (`<html className="dark">`). Non installare `next-themes`.
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
| `Table` + TanStack `DataTable` | On demand (prima pagina con tabella dati) |
| `DropdownMenu`, `Tabs`, `Pagination` | Futura |
| `Skeleton` | Futura |
