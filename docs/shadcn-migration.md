# shadcn/ui Migration Guide

> Documento centrale della migrazione. Contiene file list precomputati, mapping,
> prompt template e stato fasi. Ogni sessione Claude legge questo file invece di
> ri-fare discovery — risparmio token significativo.
>
> Al termine della migrazione: estrarre le sezioni "Component Map" e "Dialog Pattern"
> in CLAUDE.md Known Patterns, poi eliminare questo file.

---

## Stato fasi

- [x] Prerequisito — dashboard label fix (Compensi/Rimborsi "da approvare" → "in attesa")
- [x] docs/shadcn-migration.md generato
- [ ] Fase 1 — Setup infrastruttura shadcn/ui
- [ ] Fase 2 — Tooltip (Radix → sostituisce InfoTooltip)
- [ ] Fase 3 — Dialog/Sheet (8 modal custom)
- [ ] Fase 4 — Badge (status badge sistema)
- [ ] Fase 5 — Table (solo nuove pagine, post-merge)

---

## Fase 1 — Setup infrastruttura

### Obiettivo
Installare shadcn/ui con configurazione dark-only. Build verde. Nessun componente ancora
usato — solo infrastruttura.

### Comandi da eseguire (in sequenza)
```bash
# Da worktree root
npx shadcn@latest init
# Scegliere: Style=Default, Base color=Slate, CSS variables=Yes, dark mode=class
# Il comando crea: components.json, aggiorna globals.css, installa dipendenze

npm install  # installa clsx, tailwind-merge, class-variance-authority, lucide-react
```

### File modificati da shadcn init
- `components.json` (nuovo)
- `app/globals.css` (aggiunge CSS variables)
- `package.json` (aggiunge dipendenze)

### Dark-only lock
Dopo `shadcn init`, aggiungere in `app/layout.tsx`:
```tsx
// Già presente: <html lang="it" className="dark">
// Non aggiungere next-themes — dark è hardcoded, non togglabile
```

Verificare che globals.css contenga `.dark { ... }` con le variabili. Se shadcn init
ha aggiunto variabili solo su `:root`, spostarle dentro `.dark` o eliminarle da `:root`
e tenerle solo in `.dark`.

### Validazione
- `npx tsc --noEmit` → 0 errori
- `npm run build` → verde
- `GET /` in browser → nessuna differenza visiva (nessun componente ancora usato)

---

## Fase 2 — Tooltip

### Obiettivo
Sostituire `components/ui/InfoTooltip.tsx` (workaround `useState` per Tailwind v4 broken)
con Radix Tooltip via shadcn. Risolve definitivamente il bug documentato in CLAUDE.md.

### Comando
```bash
npx shadcn add tooltip
# Installa: @radix-ui/react-tooltip, crea components/ui/tooltip.tsx
```

### File da modificare (3 consumer + 1 da eliminare)

**Consumer InfoTooltip:**
- `components/compensation/PendingApprovedList.tsx` (linea 3 import, linea 43 uso)
- `components/compensation/PaymentOverview.tsx` (linea 2 import, linee 62 e 79 uso)
- `components/compensation/CompensationList.tsx` (linea 8 import, linea 60 uso)

**Eliminare:**
- `components/ui/InfoTooltip.tsx`

### Pattern di sostituzione
```tsx
// PRIMA
import { InfoTooltip } from '@/components/ui/InfoTooltip';
<InfoTooltip tip="testo del tooltip" />

// DOPO
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
<Tooltip>
  <TooltipTrigger asChild>
    <button type="button" className="inline-flex text-gray-500 hover:text-gray-300">
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    </button>
  </TooltipTrigger>
  <TooltipContent>testo del tooltip</TooltipContent>
</Tooltip>
```

**Nota overflow-hidden**: con Radix Tooltip il portale è fuori dal DOM tree del parent,
quindi l'`overflow-hidden` su card container non clippa più il tooltip. Il Known Pattern
documentato in CLAUDE.md diventa obsoleto — aggiornare in Phase 8.5 del blocco corrente.

### Wrapping TooltipProvider
Aggiungere `<TooltipProvider>` in `app/(app)/layout.tsx` (wrappa tutta la sezione app):
```tsx
import { TooltipProvider } from '@/components/ui/tooltip';
// Nel return:
<TooltipProvider delayDuration={300}>
  {children}
</TooltipProvider>
```

### Validazione
- `npx tsc --noEmit` → 0 errori
- `npm run build` → verde
- Smoke: aprire `/compensi` da account collaboratore → tooltip "Netto" e "Ritenuta" visibili

---

## Fase 3 — Dialog/Sheet

### Obiettivo
Sostituire 8 modal/dialog custom (pattern `fixed inset-0 z-50`) con shadcn Dialog o Sheet.

### Comandi
```bash
npx shadcn add dialog
npx shadcn add sheet
# Installa: @radix-ui/react-dialog, crea components/ui/dialog.tsx e sheet.tsx
```

### File da migrare (in ordine di priorità)

**Step 3a — Sonnet (stabilisce il pattern, scrive sezione "Dialog Pattern" sotto)**
1. `components/ticket/TicketQuickModal.tsx`

**Step 3b — Haiku (applica pattern dal doc)**
2. `components/FeedbackButton.tsx`
3. `components/compensation/ActionPanel.tsx`
4. `components/expense/ExpenseActionPanel.tsx`
5. `components/export/ExportSection.tsx`
6. `components/admin/BlocksDrawer.tsx` — usare Sheet (lateral, non Dialog centered)
7. `components/ProfileForm.tsx` — sezione modal guide P.IVA
8. `components/responsabile/CollaboratoreDetail.tsx` — sezione modal dettaglio

**Escluso:** `components/Sidebar.tsx` — usa `fixed inset-0` per overlay mobile nav, NON è un dialog.

### Regola Dialog vs Sheet
- **Dialog** → modal centrato, conferme, form brevi, dettagli
- **Sheet** → pannello laterale, form lunghi, drawer contestuale (`side="right"`)

### Dialog Pattern
> Questa sezione viene compilata da Sonnet dopo lo Step 3a.
> Il pattern stabilito viene usato da Haiku per gli step 3b.

[DA COMPILARE dopo Step 3a]

### Validazione
- `npx tsc --noEmit` → 0 errori
- `npm run build` → verde
- Smoke: aprire ticket modal, feedback modal, action panel compensi

---

## Fase 4 — Badge

### Obiettivo
Sostituire i badge status custom (Tailwind inline) con shadcn Badge + varianti custom
per i valori di stato del dominio.

### Comando
```bash
npx shadcn add badge
# Crea components/ui/badge.tsx
```

### Mapping stato → variante Badge

Il progetto usa questi stati con questi colori attuali:

**Compensations / Expenses:**
| Stato | Colore attuale | Variante shadcn | className extra |
|---|---|---|---|
| `IN_ATTESA` | amber | `outline` | `border-amber-600 text-amber-400` |
| `APPROVATO` | green | `outline` | `border-green-600 text-green-400` |
| `RIFIUTATO` | red | `destructive` | — |
| `LIQUIDATO` | blue | `outline` | `border-blue-600 text-blue-400` |

**Documents:**
| Stato | Colore attuale | Variante shadcn | className extra |
|---|---|---|---|
| `DA_FIRMARE` | amber | `outline` | `border-amber-600 text-amber-400` |
| `FIRMATO` | green | `outline` | `border-green-600 text-green-400` |

**Tickets:**
| Stato | Colore attuale | Variante shadcn | className extra |
|---|---|---|---|
| `APERTO` | blue | `outline` | `border-blue-600 text-blue-400` |
| `IN_LAVORAZIONE` | amber | `outline` | `border-amber-600 text-amber-400` |
| `CHIUSO` | gray | `secondary` | — |

### Strategia: StatusBadge centralizzato
Invece di modificare tutti i 50+ file, creare/aggiornare il componente
`components/compensation/StatusBadge.tsx` come wrapper su shadcn Badge.
Tutti i file che già lo importano vengono aggiornati automaticamente.
I file con badge inline vengono migrati separatamente.

### File chiave (StatusBadge e suoi consumer diretti)
- `components/compensation/StatusBadge.tsx` — **aggiornare per usare shadcn Badge**
- `components/compensation/ApprovazioniCompensazioni.tsx`
- `components/compensation/CompensationList.tsx`
- `components/compensation/ImportSection.tsx`
- `components/compensation/PaymentOverview.tsx`
- `components/compensation/PendingApprovedList.tsx`
- `components/expense/ApprovazioniRimborsi.tsx`
- `components/expense/ExpenseList.tsx`
- `components/expense/PendingApprovedExpenseList.tsx`

### File con badge inline (documents)
- `components/documents/DocumentList.tsx`
- `components/documents/DocumentSignFlow.tsx`
- `components/documents/DocumentUploadForm.tsx`
- `components/documents/CUBatchUpload.tsx`

### Validazione
- `npx tsc --noEmit` → 0 errori
- `npm run build` → verde
- Smoke: verificare colori badge su `/compensi` (collaboratore) e `/approvazioni` (responsabile)

---

## Component Map (da promuovere in CLAUDE.md post-migrazione)

| Esigenza UI | Componente | Note |
|---|---|---|
| Modal centrato / conferma | `Dialog` (shadcn) | `components/ui/dialog.tsx` |
| Pannello laterale / form lungo | `Sheet` (shadcn) | `side="right"`, `components/ui/sheet.tsx` |
| Tooltip informativo | `Tooltip` (shadcn/Radix) | Wrappare in `TooltipProvider` nel layout |
| Status label / badge | `Badge` (shadcn) + varianti custom | Vedi mapping stato → variante sopra |
| Tabella dati (nuove pagine) | `DataTable` (TanStack + shadcn Table) | Fase 5, post-merge |
| Bottone azione | `Button` (shadcn) | Varianti: default/outline/ghost/destructive |
| Input form | `Input` (shadcn) | Fase futura |
| Select / dropdown | `Select` (shadcn) | Fase futura |

---

## Note tecniche

### Dark-only
Il progetto è dark-only hardcoded (`<html className="dark">`). Non installare `next-themes`.
shadcn usa `dark:` variants — funzionano perché la classe `dark` è sempre presente.

### CSS variables scope
shadcn init aggiunge variabili in `:root` e `.dark`. Dato che è dark-only, i valori
che contano sono quelli in `.dark`. Verificare che non ci siano flash di tema chiaro
al caricamento.

### Componenti esistenti in components/ui/
Questi file NON vanno sovrascritti da shadcn add — sono componenti custom da mantenere:
- `CopyButton.tsx`
- `RichTextDisplay.tsx`
- `RichTextEditor.tsx`
(InfoTooltip.tsx verrà eliminato in Fase 2)

### Known patterns da aggiornare in CLAUDE.md post-migrazione
- Rimuovere: "Tooltip pattern: Tailwind v4 `group/tip` CSS-only tooltip is BROKEN"
- Rimuovere: "overflow-hidden clips tooltips"
- Aggiungere: UI Component Map (sezione sopra)
- Aggiornare Tech Stack: "Tailwind CSS + shadcn/ui (Radix primitives)"
