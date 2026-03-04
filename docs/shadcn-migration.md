# shadcn/ui Migration Plan

> Piano di migrazione progressiva verso shadcn/ui. File persistente fino al completamento
> della Fase 9 (cleanup finale). Ogni sessione Claude legge questo file per riallinearsi
> sullo stato attuale prima di procedere.
>
> **Non eliminare** fino a quando tutte le fasi non sono ✅ e il cleanup finale è eseguito.

---

## Stato fasi

### Completate (nel branch `worktree-shadcn-migration`, mergiato in main)

- [x] Prerequisito — dashboard label fix ("da approvare" → "in attesa")
- [x] Fase 1 — Setup infrastruttura shadcn/ui (components.json, CSS vars, utils, dark-only)
- [x] Fase 2 — Tooltip (InfoTooltip riscritta su Radix, `<TooltipProvider>` in app layout)
- [x] Fase 3 — Dialog/Sheet (8 modal custom + Block 15 components)
- [x] Fase 4 — Badge (StatusBadge sistema + ticket + dashboard components)
- [x] Allineamento Block 15 — TicketStatusBadge, TicketDetailModal, CollabOpenTicketsSection, DashboardPendingItems, DashboardTicketSection

### In piano (da eseguire post-merge, blocchi separati su main)

- [ ] Fase 5 — Table (TanStack + shadcn Table, solo nuove pagine — attivare al primo bisogno)
- [ ] Fase 6 — Input / Textarea (~22 file con elementi nativi `<input>` e `<textarea>`)
- [ ] Fase 7 — Select (~15 file con `<select>` nativi)
- [ ] Fase 8 — Button audit (bottoni primari → shadcn Button variants, ~30 file)
- [ ] Fase 9 — Cleanup finale (delete questo file, sezione finale CLAUDE.md)

---

## Component Map (canonical — da CLAUDE.md)

| Esigenza UI | Componente | Note |
|---|---|---|
| Modal centrato / conferma | `Dialog` (shadcn) | `components/ui/dialog.tsx` |
| Pannello laterale / form lungo | `Sheet` (shadcn) | `side="right"`, `components/ui/sheet.tsx` |
| Tooltip informativo | `Tooltip` (shadcn/Radix) | `<TooltipProvider>` in `app/(app)/layout.tsx` |
| Status label / badge | `Badge` (shadcn) + varianti custom | Vedi mapping stato → variante |
| Tabella dati (nuove pagine) | `DataTable` (TanStack + shadcn Table) | Fase 5 |
| Bottone azione | `Button` (shadcn) | Fase 8 — varianti: default/outline/ghost/destructive |
| Input form | `Input` (shadcn) | Fase 6 |
| Select / dropdown | `Select` (shadcn) | Fase 7 |
| Textarea | `Textarea` (shadcn) | Fase 6 |

---

## Mapping stato → variante Badge

**Compensations / Expenses:**
| Stato | Variante | className extra |
|---|---|---|
| `IN_ATTESA` | `outline` | `border-amber-600 text-amber-400` |
| `APPROVATO` | `outline` | `border-green-600 text-green-400` |
| `RIFIUTATO` | `destructive` | — |
| `LIQUIDATO` | `outline` | `border-blue-600 text-blue-400` |

**Documents:**
| Stato | Variante | className extra |
|---|---|---|
| `DA_FIRMARE` | `outline` | `border-amber-600 text-amber-400` |
| `FIRMATO` | `outline` | `border-green-600 text-green-400` |

**Tickets:**
| Stato | Variante | className extra |
|---|---|---|
| `APERTO` | `outline` | `border-blue-600 text-blue-400` |
| `IN_LAVORAZIONE` | `outline` | `border-amber-600 text-amber-400` |
| `CHIUSO` | `secondary` | — |

---

## Dialog Pattern

```tsx
// Dialog (centered modal)
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

<Dialog open={showModal} onOpenChange={(v) => { if (!v) { setShowModal(false); resetState(); } }}>
  <DialogContent className="max-w-md bg-gray-900 border-gray-800">
    <DialogHeader>
      <DialogTitle className="text-base font-semibold text-gray-100">Titolo</DialogTitle>
    </DialogHeader>
    {/* body content */}
    <div className="flex gap-3 justify-end">
      <button onClick={() => { setShowModal(false); resetState(); }}>Annulla</button>
      <button onClick={handleConfirm}>Conferma</button>
    </div>
  </DialogContent>
</Dialog>

// Sheet (lateral panel, side="right")
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

**Key rules:**
- `DialogContent` include built-in X button (`showCloseButton=true` default) — no manual ✕ needed
- `onOpenChange(false)` fires for both X click and Esc — always reset form state there
- For scrollable Dialog bodies: `p-0 gap-0` on DialogContent + manual padding on children
- For custom header layouts (flex-row): add `pr-10` to the header div to avoid overlap with built-in X
- Sheet `sm:max-w-lg` overrides the default `sm:max-w-sm`

---

## Selettori e2e per componenti shadcn

I test e2e scritti post-migrazione devono usare selettori stabili basati su `data-*` attribute, non classi CSS colore.

| Componente | Selettore raccomandato | Note |
|---|---|---|
| `Badge` status compensi/rimborsi | `[data-stato="APPROVATO"]` | Aggiungere `data-stato={stato}` a `StatusBadge` |
| `Badge` ticket | `[data-ticket-stato="CHIUSO"]` | Già presente in `TicketStatusBadge` |
| `Dialog` overlay | `[data-slot="dialog-overlay"]` | Radix data-slot attribute |
| `Dialog` content | `[data-slot="dialog-content"]` | Per scoping selettori dentro il modal |
| `Badge` generico | `[data-slot="badge"]` | Tutti i Badge shadcn |

**Nota:** `data-stato` va aggiunto a `StatusBadge.tsx` prima di riscrivere i test e2e (Fase post-Fase 9).

---

## Note tecniche

### Dark-only
Il progetto è dark-only hardcoded (`<html className="dark">`). Non installare `next-themes`.
shadcn usa `dark:` variants — funzionano perché la classe `dark` è sempre presente.

### Componenti esistenti in components/ui/ da NON sovrascrivere
- `CopyButton.tsx`
- `RichTextDisplay.tsx`
- `RichTextEditor.tsx`
- `InfoTooltip.tsx` — mantenerla come wrapper su shadcn Tooltip (backward compat)

### Fase 6–8: strategia di migrazione form
- Procedere per pagina, non per componente — evitare refactoring parziali
- Priorità: pagine con più form (onboarding, profilo, crea-utente)
- Input/Select/Textarea shadcn richiedono `react-hook-form` per integrazione completa — valutare se introdurlo in Fase 6 o usare controlled state come oggi

---

## Fasi dettagliate (da pianificare)

### Fase 5 — Table
```bash
npx shadcn add table
```
- Attivare solo quando arriva la prima pagina che necessita di DataTable
- Pattern: TanStack Table + shadcn `<Table>` component
- Nessun file esistente da migrare

### Fase 6 — Input / Textarea
```bash
npx shadcn add input
npx shadcn add textarea
```
**File prioritari** (~22 totali):
- `components/ProfileForm.tsx`
- `components/admin/CreateUserForm.tsx`
- `components/expense/ExpenseForm.tsx`
- `components/ticket/TicketQuickModal.tsx` (già Dialog, aggiornare campi)
- Tutti i file con `<input ` o `<textarea ` nativi

### Fase 7 — Select
```bash
npx shadcn add select
```
**File prioritari** (~15 totali):
- Tutti i file con `<select ` nativi
- Valutare: shadcn Select non supporta `<option>` nativo — wrapper necessario per i casi semplici

### Fase 8 — Button audit
```bash
# Button già installato (dipendenza di dialog)
```
- Non sostituire TUTTI i `<button>` — solo quelli che beneficiano delle varianti shadcn
- Target: CTA primari (submit, actions), non bottoni inline/icon
- Varianti: `default` (primary), `outline` (secondary), `ghost` (tertiary), `destructive` (danger)

### Fase 9 — Cleanup finale
1. Aggiungere `data-stato={stato}` a `StatusBadge.tsx`
2. Aggiornare CLAUDE.md Known Patterns (sezione "shadcn/ui patterns")
3. Eliminare questo file (`docs/shadcn-migration.md`)
4. Assicurarsi che il Component Map sia completo in CLAUDE.md
