# UI Kit Token & Component Migration Plan

> **File permanente di riferimento** — non eliminare fino a completamento.
> Aggiornare lo stato di ogni passaggio al termine dell'implementazione.
> Creato: 2026-03-05 · Audit completo eseguito su ~220 file.

---

## Contesto

Il progetto ha completato l'installazione dei componenti shadcn/ui (Fasi 1–9) e l'adozione del
token system del UI kit (`--base-*` scale via `themes.css`, Phase A del ui-kit-adoption.md).
Tuttavia l'interfaccia visiva non riflette ancora il UI kit perché:

1. ~51 file usano classi Tailwind hardcoded (`bg-gray-900`, `border-gray-800`, `text-gray-100`)
   che NON reagiscono al sistema di token semantici
2. I componenti shadcn (Card, Button, Checkbox, Table) sono installati ma non usati nelle pagine

---

## Passaggio A — Token Semantici 🔲

**Obiettivo**: sostituire tutti i colori hardcoded Tailwind con i token semantici del UI kit.
Questo fa reagire l'intera app al tema (light/dark) senza cambiare la struttura HTML.

**Pattern di sostituzione:**

| Classe hardcoded | Token semantico |
|---|---|
| `bg-gray-950`, `bg-gray-900` | `bg-background` |
| `bg-gray-800`, `bg-gray-800/50` | `bg-card` o `bg-muted` |
| `bg-gray-700` | `bg-muted` |
| `border-gray-800`, `border-gray-700` | `border-border` |
| `text-gray-100`, `text-white` | `text-foreground` |
| `text-gray-400`, `text-gray-500` | `text-muted-foreground` |
| `text-gray-300` | `text-foreground` (80%) |
| `hover:bg-gray-800`, `hover:bg-gray-700` | `hover:bg-muted` |
| `divide-gray-800` | `divide-border` |
| `placeholder-gray-500` | `placeholder:text-muted-foreground` |
| `focus:border-blue-500` | `focus:border-ring` |

**File prioritari** (51 totali con pattern manuali):

### Compensation
- `components/compensation/ActionPanel.tsx` — ⚠️ parzialmente aggiornato da linter
- `components/compensation/CompensationEditModal.tsx` — ⚠️ parzialmente aggiornato da linter
- `components/compensation/CompensationDetail.tsx`
- `components/compensation/CompensationList.tsx`
- `components/compensation/CompensationCreateWizard.tsx`
- `components/compensation/ApprovazioniCompensazioni.tsx`
- `components/compensation/PendingApprovedList.tsx`
- `components/compensation/ImportSection.tsx`
- `components/compensation/Timeline.tsx`
- `app/(app)/compensi/[id]/page.tsx` — ⚠️ parzialmente aggiornato da linter

### Expense
- `components/expense/ExpenseActionPanel.tsx`
- `components/expense/ExpenseList.tsx`
- `components/expense/ExpenseForm.tsx`
- `components/expense/ApprovazioniRimborsi.tsx`
- `components/expense/PendingApprovedExpenseList.tsx`
- `app/(app)/rimborsi/[id]/page.tsx`

### Contenuti (admin)
- `components/contenuti/CommunicationList.tsx`
- `components/contenuti/EventList.tsx`
- `components/contenuti/OpportunityList.tsx`
- `components/contenuti/DiscountList.tsx`
- `components/contenuti/ResourceList.tsx`

### Impostazioni
- `components/impostazioni/CreateUserForm.tsx`
- `components/impostazioni/CommunityManager.tsx`
- `components/impostazioni/NotificationSettingsManager.tsx`
- `components/impostazioni/MemberStatusManager.tsx`
- `components/impostazioni/ContractTemplateManager.tsx`

### Responsabile
- `components/responsabile/CollaboratoreDetail.tsx`
- `components/responsabile/DashboardPendingItems.tsx`

### Documenti
- `components/documents/DocumentList.tsx`
- `components/documents/DocumentUploadForm.tsx`
- `components/documents/DocumentSignFlow.tsx`
- `components/documents/CUBatchUpload.tsx`

### Ticket
- `components/ticket/TicketList.tsx`
- `components/ticket/TicketDetailModal.tsx`
- `components/ticket/TicketStatusInline.tsx`
- `components/ticket/CollabOpenTicketsSection.tsx`

### Dashboard & Nav
- `components/Sidebar.tsx`
- `components/notifications/NotificationPageClient.tsx`
- `components/admin/AdminDashboard.tsx`
- `app/(app)/collaboratori/page.tsx`
- `app/(app)/coda/page.tsx`

### Shared pages
- `app/(app)/profilo/page.tsx`
- `app/(app)/approvazioni/page.tsx`
- `app/(app)/compensi/page.tsx`
- `components/ProfileForm.tsx`

**Completion criteria:**
- [ ] Tutti i file sopra usano token semantici
- [ ] `tsc --noEmit` green
- [ ] `npm run build` green
- [ ] Smoke test light + dark mode: login, dashboard, compensi, rimborsi, impostazioni

---

## Passaggio B — Componenti shadcn 🔲

**Obiettivo**: sostituire pattern HTML nativi con i componenti shadcn dove disponibili.
Eseguire DOPO il Passaggio A.

### B1 — Card (priorità critica)
**Gap**: 51 file con `<div className="rounded-xl bg-...">` come container card.
**Pattern:**
```tsx
// Prima
<div className="rounded-xl bg-card border border-border p-4">

// Dopo
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
<Card><CardContent className="p-4">…</CardContent></Card>
```
**File prioritari**: tutti i file del Passaggio A con pattern card container.

### B2 — Button (priorità alta)
**Gap**: 35 file con `<button` nativo.
**File con native `<button>` da migrare:**
- `components/compensation/ActionPanel.tsx`
- `components/compensation/CompensationEditModal.tsx`
- `components/compensation/CompensationCreateWizard.tsx`
- `components/compensation/CompensationList.tsx`
- `components/compensation/ApprovazioniCompensazioni.tsx`
- `components/compensation/ImportSection.tsx`
- `components/expense/ExpenseActionPanel.tsx`
- `components/expense/ExpenseList.tsx`
- `components/expense/ApprovazioniRimborsi.tsx`
- `components/documents/DocumentList.tsx`
- `components/documents/DocumentSignFlow.tsx`
- `components/documents/DocumentUploadForm.tsx`
- `components/documents/CUBatchUpload.tsx`
- `components/impostazioni/ContractTemplateManager.tsx`
- `components/impostazioni/NotificationSettingsManager.tsx`
- `components/ticket/TicketList.tsx`
- `components/ticket/TicketStatusInline.tsx`
- `components/ticket/CollabOpenTicketsSection.tsx`
- `components/notifications/NotificationPageClient.tsx`
- `components/responsabile/DashboardPendingItems.tsx`
- `components/export/ExportSection.tsx`
- `components/FeedbackActions.tsx`
- `components/admin/AdminDashboard.tsx`
- + altri (vedi audit)

**Pattern variant mapping:**
```tsx
// Primario (azione principale)
<Button className="bg-blue-600 hover:bg-blue-500 text-white">Salva</Button>

// Secondario / annulla
<Button variant="outline">Annulla</Button>

// Ghost (toolbar, inline)
<Button variant="ghost" size="sm">Modifica</Button>

// Destructive
<Button variant="destructive">Rifiuta</Button>
```

### B3 — Checkbox (priorità alta)
**Gap**: 13 file con `<input type="checkbox">` nativo.
**File:**
- `components/contenuti/CommunicationList.tsx`
- `components/contenuti/DiscountList.tsx`
- `components/contenuti/EventList.tsx`
- `components/contenuti/OpportunityList.tsx`
- `components/contenuti/ResourceList.tsx`
- `components/documents/DocumentSignFlow.tsx`
- `components/expense/ApprovazioniRimborsi.tsx`
- `components/impostazioni/CommunityManager.tsx`
- `components/impostazioni/CreateUserForm.tsx`
- `components/onboarding/OnboardingWizard.tsx`
- `components/ProfileForm.tsx`
- `components/responsabile/CollaboratoreDetail.tsx`
- `components/compensation/CompensationCreateWizard.tsx`

**Pattern:**
```tsx
import { Checkbox } from '@/components/ui/checkbox';
<Checkbox checked={checked} onCheckedChange={(v) => setChecked(!!v)} />
```

### B4 — Table (priorità media)
**Gap**: 8 file con `<table>` nativo.
**File:**
- `app/(app)/collaboratori/page.tsx`
- `components/compensation/ImportSection.tsx`
- `components/compensation/PendingApprovedList.tsx`
- `components/documents/DocumentList.tsx`
- `components/expense/PendingApprovedExpenseList.tsx`
- `components/responsabile/CollaboratoreDetail.tsx`
- `components/ticket/TicketList.tsx`

**Pattern**: vedi `docs/ui-components.md` sezione Table.

### B5 — Skeleton loading states (priorità media)
**Gap**: nessun componente ha loading skeletons.
**File candidati** (hanno stati di loading):
- `components/compensation/CompensationCreateWizard.tsx`
- `components/compensation/ImportSection.tsx`
- `components/responsabile/DashboardPendingItems.tsx`
- `components/impostazioni/CommunityManager.tsx`

**Pattern:**
```tsx
import { Skeleton } from '@/components/ui/skeleton';
{loading ? <Skeleton className="h-10 w-full" /> : <ActualContent />}
```

---

## Stato avanzamento

| Passaggio | Stato | Data | Note |
|---|---|---|---|
| A — Token semantici | ✅ | 2026-03-05 | 7 file aggiornati, resto già migrato in sessioni precedenti |
| B1 — Card | ✅ | 2026-03-05 | 38 div→Card/CardContent in 25 file |
| B2 — Button | ✅ | 2026-03-05 | Native <button> → Button variant in ~23 file |
| B3 — Checkbox | ✅ | 2026-03-05 | <input type="checkbox"> → Checkbox in 13 file |
| B4 — Table | ✅ | 2026-03-05 | Native table → Table components in 8 file |
| B5 — Skeleton | 🔲 | — | Deferred — additive, not blocking |

---

## Note operative

- **Ordine obbligatorio**: completare il Passaggio A prima di iniziare qualsiasi fase del B.
  Il Passaggio A garantisce che i token siano risolti correttamente — senza di esso i componenti
  shadcn usano token non valorizzati e appaiono senza stile.
- **File già parzialmente aggiornati** da linter (2026-03-05):
  `ActionPanel.tsx`, `CompensationEditModal.tsx`, `app/(app)/compensi/[id]/page.tsx`
- **Non migrare**: `components/ui/InfoTooltip.tsx`, `RichTextEditor.tsx`, `RichTextDisplay.tsx`,
  `CopyButton.tsx` — componenti custom, non shadcn standard.
- **Smoke test**: dopo ogni sotto-passaggio verificare light + dark mode nel browser.
