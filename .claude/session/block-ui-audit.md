# Block: UI Quality Audit

## Status: PLAN LOCKED — Phase 2 ready

## All decisions confirmed
- Banner info → --info token + Alert component
- LIQUIDATO badge → verde
- I-6: content cards admin → edit-in-place (nessun cambio)
- Gruppo 9e/9f: modal-opening rows → cursor-pointer + hover only
- Nuovi componenti: button-group, input-group, collapsible, breadcrumb, progress, scroll-area
- timeline.tsx + sidebar.tsx → migrazione shadcn
- **Fase finale: UI/UX audit quality check dopo completamento di tutti i 21 gruppi**

---

## FINAL PLAN — 21 Gruppi + Final Audit

### Execution order
1. globals.css: --info token (prerequisito Gruppo 12+2)
2. Installa 8 nuovi componenti UI (alert, button-group, input-group, collapsible, breadcrumb, progress, scroll-area, timeline)
3. Gruppi 1, 3, 4, 8, 9, 11, 13 — CSS/JSX atomici
4. Gruppi 2b-2d, 5, 6, 7, 10 — JSX sostituzioni
5. Gruppi 12, 16–21 — component adoption
6. Gruppo 14 (timeline migration)
7. Gruppo 15 (sidebar migration) — ULTIMA, alto impatto
8. **FASE FINALE: UI/UX Quality Audit** — verifica compliance piano

### Gruppo 1 — Token CSS puri (🟢 ~15 file)
- 1a: StatusBadge LIQUIDATO → bg-green-100 text-green-700
- 1b: TicketStatusBadge APERTO → neutral semantic
- 1c: Content type badges FORMAZIONE→indigo, WEBINAR→violet
- 1d: CollaboratorAvatar bg-blue-600 → bg-brand
- 1e: RichTextDisplay [&_a]:text-blue-400 → [&_a]:text-link
- 1f: Ticket priority BASSA bg-gray-500 → bg-muted-foreground/40
- 1g: ExpenseForm hover:border-gray-500 → hover:border-border
- 1h: CreateUserForm+NotificationPageClient border-blue-600 → border-brand

### Gruppo 2 — Banner informativi --info token (🟢 ~14 file)
- 2a: globals.css → add --info, --info-foreground CSS tokens
- 2b: Info banners → Alert variant="info"
  Files: CodaCompensazioni, CodaRimborsi, DocumentSignFlow, ProfileForm, ApprovazioniRimborsi
- 2c: Pinned communications → border-brand/30 bg-brand/5
  Files: CommunicationList, comunicazioni/page
- 2d: Dashboard/notification text-blue-* → text-brand
  Files: CompensationDetail, DashboardUpdates, AdminDashboard, NotificationBell,
         MonitoraggioSection, ApprovazioniCompensazioni, ApprovazioniRimborsi,
         DashboardPendingItems, DashboardTicketSection, TicketRecordRow,
         TicketThread, TicketDetailModal, ContractTemplateManager, FeedbackPageClient

### Gruppo 3 — Empty states (🟢 2 file)
- 3a: notifiche/page.tsx Suspense fallback → Skeleton
- 3b: ticket/page.tsx 2x bare <p> → EmptyState

### Gruppo 4 — Accessibilità aria-label (🟢 4 file)
- 4a: InfoTooltip → aria-label="Informazioni"
- 4b: CodaCompensazioni section toggle → aria-label
- 4c: ProfileForm GuideBox toggle → aria-label
- 4d: CommunityManager row buttons → aria-label

### Gruppo 5 — Paginazione shadcn (🟡 6 file)
- 5a: MonitoraggioSection ‹/› → Pagination shadcn
- 5b: CommunicationList, EventList, OpportunityList, DiscountList, ResourceList → shadcn Pagination

### Gruppo 6 — CopyButton (🟡 1 file)
- 6a: CopyButton → shadcn Button variant="outline" size="sm"

### Gruppo 7 — Dialog form reset (🟠 1 file)
- 7a: CompensationEditModal → reset campi su onOpenChange(false)

### Gruppo 8 — Toast richColors (🟢 2 file)
- 8a: app/(app)/layout.tsx Toaster → richColors
- 8b: app/login/layout.tsx Toaster → richColors

### Gruppo 9 — Chevron uniforme (🟢 5 file)
- 9a: CompensationList SVG → ChevronRight Lucide
- 9b: ExpenseList SVG → ChevronRight Lucide
- 9c: TicketList + TicketRecordRow "→" → ChevronRight Lucide
- 9d: DocumentList collab: rimuove cella "Apri →"

### Gruppo 10 — TicketList Link (🟡 1 file)
- 10a: TicketList onClick+router.push → <Link>

### Gruppo 11 — Detail page layout (🟢 ~8 file)
- 11a: max-w-2xl su 5 content detail pages
- 11c: h1 text-xl font-semibold uniforme

### Gruppo 12 — alert.tsx + variante info (🟢 1 nuovo)
- 12a: copia alert.tsx → components/ui/alert.tsx
- 12b: aggiunge variante "info"

### Gruppo 13 — Table/card sizing (🟢 ~7 file)
- 13a: ExpenseList categoria → truncate
- 13b: Content lists descrizioni → line-clamp-3
- 13c: CodaCompensazioni/Rimborsi → colonna azioni w-16
- 13d: ApprovazioniCompensazioni KPI → grid-cols-1 sm:grid-cols-3
- 13e: MemberStatusManager → hidden sm:table-cell

### Gruppo 14 — Timeline migration (🟡 TBD)
- Copia timeline.tsx → components/ui/timeline.tsx
- Migra componenti timeline custom

### Gruppo 15 — Sidebar migration (🟠 alto impatto)
- Copia sidebar.tsx → components/ui/sidebar.tsx
- Refactor Sidebar.tsx → shadcn compound pattern

### Gruppo 16 — button-group (🟢 2+1 file)
- 16a: copia button-group.tsx → components/ui/button-group.tsx
- 16b: CreateUserForm L213-231 → ButtonGroup
- 16c: NotificationPageClient L150-172 → ButtonGroup

### Gruppo 17 — input-group (🟢 2+1 file)
- 17a: copia input-group.tsx → components/ui/input-group.tsx
- 17b: CollaboratoriSearchInput → InputGroup con Search icon
- 17c: ImportCollaboratoriSection GSheet URL → InputGroup

### Gruppo 18 — collapsible (🟡 4+1 file)
- 18a: copia collapsible.tsx → components/ui/collapsible.tsx
- 18b: MonitoraggioSection SectionAccordion → Collapsible
- 18c: ProfileForm GuideBox → Collapsible
- 18d: CodaCompensazioni sections → Collapsible
- 18e: CodaRimborsi sections → Collapsible

### Gruppo 19 — breadcrumb (🟢 4+1 file)
- 19a: copia breadcrumb.tsx → components/ui/breadcrumb.tsx
- 19b: compensi/[id]/page.tsx → Breadcrumb
- 19c: rimborsi/[id]/page.tsx → Breadcrumb
- 19d: ticket/[id]/page.tsx → Breadcrumb
- 19e: collaboratori/[id]/page.tsx → Breadcrumb

### Gruppo 20 — progress (🟢 2+1 file)
- 20a: copia progress.tsx → components/ui/progress.tsx
- 20b: OnboardingWizard → Progress bar step 1/2
- 20c: DocumentSignFlow → Progress bar fasi firma

### Gruppo 21 — scroll-area (🟢 3+1 file)
- 21a: copia scroll-area.tsx → components/ui/scroll-area.tsx
- 21b: MonitoraggioSection email table → ScrollArea
- 21c: CodaCompensazioni bulk receipt → ScrollArea
- 21d: CodaRimborsi bulk receipt → ScrollArea

### FASE FINALE — UI/UX Quality Audit
Verifica sistematica post-implementazione:
- [ ] Tutti i token blu hardcoded sostituiti (grep residui)
- [ ] Tutti i banner usano Alert variant="info"
- [ ] Tutti i toast colorati (richColors attivo, verifica visiva)
- [ ] Tutti i chevron uniformi (ChevronRight Lucide)
- [ ] Tutte le breadcrumb corrette e consistenti
- [ ] Tutti i collapsible animati correttamente
- [ ] Paginazione uniforme su tutti i contesti
- [ ] Tabelle: colonne allineate, truncate presenti, sizing corretto
- [ ] Card content: line-clamp-3 attivo
- [ ] Progress bar visibili in onboarding e sign flow
- [ ] Button-group visivamente coeso nei toggle
- [ ] Input-group icone allineate e funzionanti
- [ ] Light mode + dark mode: nessuna anomalia visiva
- [ ] tsc --noEmit: 0 errori
- [ ] npm run build: success

---

## GRAND TOTAL
- Gruppi: 21 + 1 audit finale
- File modificati: ~85
- File nuovi: 8 componenti
- Regressioni funzionali: 0
- Modifiche API/DB: 0
