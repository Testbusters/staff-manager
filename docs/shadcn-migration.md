# shadcn/ui Migration Plan

> Piano di migrazione progressiva verso shadcn/ui. File persistente fino al completamento
> della Fase 9 (cleanup finale). Ogni sessione Claude legge questo file per riallinearsi
> sullo stato attuale prima di procedere.
>
> **Non eliminare** fino a quando tutte le fasi non sono ✅ e il cleanup finale è eseguito.

---

## Stato fasi

### Completate

- [x] Prerequisito — dashboard label fix ("da approvare" → "in attesa")
- [x] Fase 1 — Setup infrastruttura shadcn/ui (components.json, CSS vars, utils, dark-only)
- [x] Fase 2 — Tooltip (InfoTooltip riscritta su Radix, `<TooltipProvider>` in app layout)
- [x] Fase 3 — Dialog/Sheet (8 modal custom + Block 15 components) — ⚠️ 99%: resta logout modal in `Sidebar.tsx` → AlertDialog
- [x] Fase 4 — Badge (StatusBadge sistema + ticket + dashboard components) — ⚠️ 95%: manca `data-stato` su `StatusBadge.tsx`
- [x] Allineamento Block 15 — TicketStatusBadge, TicketDetailModal, CollabOpenTicketsSection, DashboardPendingItems, DashboardTicketSection
- [x] Config alignment — `new-york+gray+Tailwind v4`: baseColor neutral→gray, --border/--input dark tokens fixed, cursor-pointer + overlay backdrop-blur added to @layer base

### Quick wins — chiudono Fasi 3 e 4 al 100%

Da eseguire prima di Fase 6. Entrambi risolvibili in una singola sessione breve:

- [x] **QW1** — `Sidebar.tsx`: logout confirmation → `AlertDialog` ✅ 2026-03-04
- [x] **QW2** — `StatusBadge.tsx`: `data-stato={stato}` aggiunto ✅ 2026-03-04

### In piano (da eseguire su main, blocchi separati)

- [ ] Fase 5 — Table (TanStack + shadcn Table, solo nuove pagine — attivare al primo bisogno, nessun file esistente da migrare)
- [ ] Fase 6 — Input / Textarea (**137 `<input>` in 30 file + 11 `<textarea>` in 11 file** — cifre da audit 2025-03-04)
- [ ] Fase 7 — Select (**15 `<select>` in 15 file**)
- [ ] Fase 8 — Button audit (**271+ `<button>` in 47 file** — solo CTA primari, non tutti)
- [ ] Fase 9 — Cleanup finale (delete questo file, `data-stato` check, CLAUDE.md update)

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

### Turbopack + CSS "style" exports condition
Next.js 16 Turbopack non supporta la condizione `"style"` negli `exports` di `package.json` per `@import` CSS. Colpisce `tw-animate-css` e `shadcn/tailwind.css`. Fix applicato: file copiati in `app/tw-animate.css` e `app/shadcn-tailwind.css`, importati con percorso relativo in `globals.css`. I package npm restano come riferimento di versione. **Se si aggiorna una delle due dipendenze: ricopiare il file dist.**

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

## Fasi dettagliate

### Quick Wins (prerequisito per Fase 6)

#### QW1 — AlertDialog per Sidebar logout
```bash
npx shadcn add alert-dialog
```
- File: `components/Sidebar.tsx` — sostituire il blocco `fixed inset-0 z-50` (logout confirmation) con `AlertDialog`
- Pattern: `AlertDialog` + `AlertDialogTrigger` + `AlertDialogContent` + `AlertDialogAction`/`AlertDialogCancel`

#### QW2 — data-stato su StatusBadge
- File: `components/compensation/StatusBadge.tsx`
- Aggiungere `data-stato={stato}` al `<Badge>` component
- Pattern atteso: `<Badge data-stato={stato} ...>`
- Prerequisito obbligatorio per i selettori e2e in Fase 9

---

### Fase 5 — Table
```bash
npx shadcn add table
```
- Attivare solo quando arriva la prima pagina che necessita di DataTable
- Pattern: TanStack Table + shadcn `<Table>` component
- **Nessun file esistente da migrare** — solo nuove pagine

---

### Fase 6 — Input / Textarea
```bash
npx shadcn add input textarea label
```

**Cifre da audit (2025-03-04):**
- `<input>` nativi: **137 in 30 file**
- `<textarea>` nativi: **11 in 11 file**

**Strategia**: migrare per pagina/componente completo, non per tipo di elemento.
Iniziare dalle `<textarea>` (11 file, 1 per file — rischio basso).

**File `<input>` ad alto impatto (installare prima):**
| File | Input count |
|---|---|
| `components/impostazioni/CreateUserForm.tsx` | 18 |
| `components/ProfileForm.tsx` | 16 |
| `components/responsabile/CollaboratoreDetail.tsx` | 15 |
| `components/onboarding/OnboardingWizard.tsx` | 13 |
| `components/contenuti/DiscountList.tsx` | 9 |

**File `<textarea>` (1 per file — partire da qui):**
`FeedbackButton.tsx`, `TicketDetailModal.tsx`, `TicketQuickModal.tsx`, `TicketForm.tsx`,
`TicketMessageForm.tsx`, `ActionPanel.tsx`, `ExpenseActionPanel.tsx`, `ExpenseForm.tsx`,
`CollaboratoreDetail.tsx`, `CommunicationList.tsx`, `CompensationCreateWizard.tsx`

**Nota**: shadcn `Input` e `Textarea` sono controlled components — mantengono `value`/`onChange` come oggi. Non richiedono `react-hook-form`.

---

### Fase 7 — Select
```bash
npx shadcn add select
```

**Cifre da audit (2025-03-04):**
- `<select>` nativi: **15 in 15 file**

**File con 2 select (priorità):**
`CompensationCreateWizard.tsx`, `TicketQuickModal.tsx`, `TicketForm.tsx`, `DocumentUploadForm.tsx`

**Attenzione**: shadcn `Select` non accetta `<option>` nativi — usa `SelectItem`. Per select con poche opzioni statiche è semplice; per select con array dinamici: wrapper con `.map()` → `<SelectItem>`.

---

### Fase 8 — Button audit
```bash
# Button già installato (dipendenza di Dialog) — nessun install necessario
```

**Cifre da audit (2025-03-04):**
- `<button>` nativi: **271+ in 47+ file**
- `Button` shadcn attualmente usato da **0 file app** (solo come dipendenza interna)

**Strategia**: NON sostituire tutti i `<button>`. Target solo:
- CTA primari di submit form → `Button` (variant `default`)
- Azioni distruttive (elimina, rifiuta) → `Button` (variant `destructive`)
- Azioni secondarie in modal/header → `Button` (variant `outline` o `ghost`)
- Bottoni icon-only → considerare caso per caso

**File ad alto impatto:**
| File | Button count |
|---|---|
| `components/responsabile/CollaboratoreDetail.tsx` | 12 |
| `components/impostazioni/CommunityManager.tsx` | 9 |
| `components/notifications/NotificationPageClient.tsx` | 8 |
| `components/expense/ExpenseForm.tsx` | 7 |

---

### Fase 9 — Cleanup finale
1. Verificare `data-stato={stato}` su `StatusBadge.tsx` (QW2 — già fatto se QW2 eseguito)
2. Aggiornare CLAUDE.md: rimuovere riferimento a `docs/shadcn-migration.md` (file temporaneo)
3. Aggiornare `docs/ui-components.md`: aggiornare stato di ogni componente a "✅ Disponibile"
4. Eliminare questo file (`docs/shadcn-migration.md`)

---

## UI kit — componenti disponibili (non ancora installati)

Kit disponibile in `/tmp/shadcn-ui-kit-dashboard-main/components/ui/` (61 componenti).
Usare `npx shadcn add <nome>` per installare (NON copiare direttamente dal kit).

| Componente | Fase | Priorità |
|---|---|---|
| `alert-dialog` | QW1 (Sidebar logout) | Immediata |
| `input` | 6 | Alta |
| `textarea` | 6 | Alta |
| `label` | 6 (companion a input) | Alta |
| `select` | 7 | Alta |
| `table` | 5 (on demand) | On demand |
| `tabs` | futura | Media |
| `pagination` | futura | Media |
| `dropdown-menu` | 8 (button audit) | Media |
| `checkbox`, `radio-group`, `switch` | 6/8 | Media |
| `card`, `avatar`, `separator` | futura | Bassa |
| `form` (react-hook-form wrapper) | futura | Bassa |
