# Staff Manager — Implementation Checklist

> Aggiornare questo file al termine di ogni blocco funzionale (Fase 8 della pipeline).
> È la fonte di verità sullo stato dei lavori. Leggere prima di iniziare un nuovo blocco.
> Aggiornato 2026-03-03. Blocco 13b ✅. Prossimo: da definire.

---

## Log

| Data | Blocco | Stato | Test | Note |
|---|---|---|---|---|
| 2026-02-26 | Blocco 1 — Revisione ruoli e utenze di test | ✅ | tsc ✅, build ✅, vitest 106/106 ✅, e2e ⏸ (sospeso temporaneamente) | `017_roles_rename.sql` applicata. Bug fix `importo`/`data_compenso` in transition route. |
| 2026-02-26 | Blocco 2 — Ristrutturazione menu collaboratore | ✅ | tsc ✅, build ✅, vitest 106/106 ✅, e2e ⏸ (sospeso), smoke test OK | 8 voci nav, unified Compensi e Rimborsi, TicketQuickModal, Profilo e Documenti tabs, 3 nuove pagine (eventi/comunicazioni/opportunita). |
| 2026-02-27 | Blocco 3 — Correzioni sezione profilo + consolidamento OCCASIONALE | ✅ | tsc ✅, build ✅, vitest 106/106 ✅, e2e ⏸ (sospeso) | Rename `ha_figli_a_carico` → `sono_un_figlio_a_carico`, add `importo_lordo_massimale` + progress bar + guide modale, rimozione P.IVA e COCOCO, consolidamento OCCASIONALE. Migrations 018-020. |
| 2026-02-27 | Blocco 4 — Username generation + validazioni CF/IBAN | ✅ | tsc ✅, build ✅, vitest 129/129 ✅, e2e ⏸ (sospeso) | Migration 021 (username TEXT UNIQUE). `lib/username.ts`. Username auto-generato in create-user, inline edit in CollaboratoreDetail, readonly badge in ProfileForm e OnboardingWizard. CF normalization (alphanumeric+uppercase) in tutti i form. Zod: CF `/^[A-Z0-9]{16}$/` in profile+onboarding, IBAN regex in onboarding. |
| 2026-02-27 | Blocco 5 — Editing profilo responsabile_compensi + security fix + contratto profilo | ✅ | tsc ✅, build ✅, vitest 141/141 ✅, e2e ⏸ (sospeso) | Fix community check su PATCH username. Nuovo `PATCH /api/admin/collaboratori/[id]/profile` (no IBAN). Form edit in CollaboratoreDetail. `docs/profile-editing-contract.md`. Username `collaboratore_test` generato per utente canonico. |
| 2026-02-27 | Blocco 6 — Wizard rimborso 3-step + aggiornamento categorie | ✅ | tsc ✅, build ✅, vitest 153/153 ✅, e2e ⏸ (sospeso), smoke test OK | Migration 022 (descrizione nullable). ExpenseForm refactored wizard 3-step (Dati→Allegati→Riepilogo+Conferma). EXPENSE_CATEGORIES: Trasporti/Materiali/Cancelleria. TICKET_CATEGORIES: Generale/Compensi/Documenti/Accesso/Altro. |
| 2026-02-27 | Blocco 7 — Refactor workflow compensi + Blocco 8 — Wizard carico compensi | ✅ | tsc ✅, build ✅, vitest 156/156 ✅, e2e ⏸ (sospeso), smoke test OK | Migration 024 (rimozione BOZZA, DEFAULT IN_ATTESA, cors_appartenenza). Workflow: IN_ATTESA→APPROVATO→LIQUIDATO/RIFIUTATO; reopen RIFIUTATO→IN_ATTESA. POST /api/compensations riscritto (responsabile/admin only). GET /api/admin/collaboratori (ricerca community-scoped). CompensationCreateWizard 3-step. /approvazioni/carica. |
| 2026-03-02 | Blocco 9 — Finalizzazione sezione Collaboratore - Compensi e Rimborsi | ✅ | tsc ✅, build ✅, vitest 156/156 ✅, e2e ⏸ (sospeso, CLAUDE.local.md), smoke test OK | PaymentOverview redesign: verbose labels ("Netto ricevuto nel {year}", ritenuta 20% con InfoTooltip), sezione APPROVATO separata, IN_ATTESA dimmed. Tab Compensi: PendingApprovedList (card "Da ricevere"), CompensationList con chevron + meta labeling (Competenza/Inviato). Tab Rimborsi: PendingApprovedExpenseList (card "Da liquidare"), ExpenseList con date etichettate (Spesa/Inviato) + chevron. InfoTooltip client component (useState, keyboard-accessible). Rimossi file obsoleti: CompensationWizard.tsx, compensi/nuova/page.tsx, attachments route. TicketQuickModal → bg-blue-600. |
| 2026-03-02 | Blocco 10 — Sezione Documenti Collaboratore | ✅ | tsc ✅, build ✅, vitest 167/167 ✅ (11 nuovi in documents.test.ts), e2e ⏸ (sospeso), smoke test OK | Migration 025: RICEVUTA_PAGAMENTO rimosso da DB CHECK + macro_type. DocumentType/DocumentMacroType aggiornati. API validTipi ristretto a 2 valori. DocumentList dead code rimosso. DocumentUploadForm dropdown semplificato. profilo/page.tsx: form self-upload + CTA "Nuovo rimborso" nel tab documenti. |
| 2026-03-02 | Blocco 11 — Dashboard Collaboratore Redesign | ✅ | tsc ✅, build ✅, vitest 167/167 ✅, e2e ⏸ (sospeso), smoke test OK | Saluto con nome + data. 4 KPI cards (Compensi in corso, Rimborsi in corso, Da ricevere, Da firmare). DashboardUpdates: 4 tab (Documenti funzionale + 3 disabilitate per Block 12), paginazione prev/next, 4 elementi/pagina. Sezione posizionata dopo KPI, prima di Azioni rapide. Legenda bar chart colorata (blu/teal). Feed collaboratore rimosso. DashboardBarChart. |
| 2026-03-02 | Blocco 12 — Content Types Redesign | ✅ | tsc ✅, build ✅, vitest 167/167 ✅, e2e ⏸ (sospeso), smoke test OK | Migration 026: rename announcements→communications, benefits→discounts; new opportunities table. API /communications, /discounts, /opportunities (admin-only); /resources + /events updated. Admin /contenuti: 5 tabs, admin-only. Read pages: /eventi, /comunicazioni/[id], /risorse/[id], /opportunita, /sconti/[id]. Dashboard 4 tabs enabled. Events: Google Calendar link + Maps. Discounts: CopyButton. Resources: categoria filter. |
| 2026-03-02 | Blocco 13a — Compensi e rimborsi responsabile (redesign) | ✅ | tsc ✅, build ✅, vitest 167/167 ✅, e2e ⏸ (sospeso), smoke test OK | Nav rename Approvazioni→Compensi e rimborsi. Fetch tutti gli stati + join collaborators(nome,cognome). 4 KPI cards server-side. ApprovazioniCompensazioni: search LIKE, filtri stato, checkbox, bulk approve, paginazione 25/p, Import section disabilitata. ApprovazioniRimborsi: stessa struttura senza Import. POST /api/compensations/approve-bulk + /api/expenses/approve-bulk (community-scoped + history). Expense.community_id aggiunto a lib/types.ts. |
| 2026-03-03 | Blocco 13b — Schema alignment + GSheet import + Individual form | ✅ | tsc ✅, build ✅, vitest 182/182 ✅ (15 nuovi in compensation-import.test.ts), e2e ⏸ (sospeso), smoke test OK | Migration 030: rename descrizione→nome_servizio_ruolo, note_interne→info_specifiche; DROP corso_appartenenza; community_id nullable; CREATE compensation_competenze + 4 seed; ADD competenza FK; rewrite responsabile RLS (collaborator_id-based). lib/types.ts Compensation aggiornato. 6 consumer aggiornati. lib/google-sheets.ts wrapper (fetchPendingRows + markRowsProcessed). /api/compensations/import/preview + /confirm. ImportSection.tsx sostituisce placeholder. CompensationCreateWizard: +competenza dropdown, +info_specifiche, -community_id field, -choice step. |

---

## Blocco 1 — Revisione ruoli e utenze di test ✅

> Requisito: `docs/requirements.md` §2 — Ruoli e permessi, Utenze di test
> Dipendenze: nessuna

| Sotto-blocco | Stato | Note |
|---|---|---|
| 1a — Type system + migration DB | ✅ | `lib/types.ts` + `017_roles_rename.sql` |
| 1b — Mass replace `responsabile` nel codice | ✅ | ~40 file aggiornati |
| 1c — Login page + E2E credentials | ✅ | `login/page.tsx` + 20 spec files aggiornati |

### Sotto-blocco 1a — Type system e migration

**`lib/types.ts`**
- Rimuovere `'responsabile'` dal tipo `Role`
- Aggiungere `'responsabile_cittadino'` | `'responsabile_compensi'` | `'responsabile_servizi_individuali'`
- Aggiornare `ROLE_LABELS`

**`supabase/migrations/017_roles_rename.sql`**
- Aggiorna `CHECK constraint` su `user_profiles.role` con i nuovi valori
- `UPDATE user_profiles SET role = 'responsabile_compensi' WHERE role = 'responsabile'`
- Aggiorna tutte le RLS policy che referenziano `'responsabile'`
- Rename email utenze esistenti:
  - `responsabile@test.com` → `responsabile_compensi@test.com`
  - `responsabile_test@test.com` → `responsabile_compensi_test@test.com`
  - `admin-test@example.com` → `admin@test.com`
- Crea 4 nuovi utenti Supabase Auth (password `Testbusters123`):
  - `responsabile_cittadino@test.com` (ruolo: `responsabile_cittadino`)
  - `responsabile_servizi_individuali@test.com` (ruolo: `responsabile_servizi_individuali`)
  - `responsabile_cittadino_test@test.com` (ruolo: `responsabile_cittadino`)
  - `responsabile_servizi_individuali_test@test.com` (ruolo: `responsabile_servizi_individuali`)

### Sotto-blocco 1b — Mass replace nel codice

File core:
- `lib/nav.ts` — chiave `responsabile` → `responsabile_compensi`
- `lib/compensation-transitions.ts` — `allowedRoles`
- `lib/expense-transitions.ts` — `allowedRoles`

API routes (~40 file) — tutti i RBAC check su `'responsabile'`:
- `app/api/compensations/`, `app/api/expenses/`, `app/api/documents/`
- `app/api/tickets/`, `app/api/announcements/`, `app/api/admin/`

Componenti UI:
- `components/impostazioni/CreateUserForm.tsx` — dropdown ruoli
- `components/impostazioni/CommunityManager.tsx` — assegnazione responsabile → community
- `components/responsabile/CollaboratoreDetail.tsx`, `TicketList.tsx`, `TicketMessageForm.tsx` — label display

Unit test da aggiornare:
- `__tests__/compensation-transitions.test.ts`
- `__tests__/expense-transitions.test.ts`

### Sotto-blocco 1c — Login page e E2E

**`app/login/page.tsx`** — aggiorna `TEST_USERS` array con le 9 utenze definite in §2

**`e2e/*.spec.ts`** (19 file) — sostituzioni:
- `responsabile@test.com` → `responsabile_compensi@test.com`
- `admin-test@example.com` → `admin@test.com`

### Punti aperti
- `responsabile_cittadino`: permessi, navigazione e visibilità → da definire in blocco dedicato
- `responsabile_servizi_individuali`: idem

---

## Blocco 2 — Ristrutturazione menu collaboratore ✅

> Requisito: `docs/requirements.md` §3 — Navigazione collaboratore
> Dipendenze: Blocco 1

| Sotto-blocco | Stato | Note |
|---|---|---|
| 2a — Nav 8 voci + comingSoon flag | ✅ | `lib/nav.ts` + `components/Sidebar.tsx` |
| 2b — Profilo e Documenti (tab merge) | ✅ | `profilo/page.tsx` + redirect `documenti/page.tsx` |
| 2c — Compensi e Rimborsi unificati | ✅ | `compensi/page.tsx` rewrite + `TicketQuickModal` |
| 2d — Rimozione CTA creazione compenso | ✅ | `CompensationList.tsx`, `page.tsx` dashboard, `compensi/nuova/page.tsx` |
| 2e — Nuove pagine: eventi, comunicazioni, opportunita | ✅ | 3 nuove route, read-only |

---

## Blocco 3 — Correzioni sezione profilo + consolidamento OCCASIONALE ✅

> Requisito: `docs/requirements.md` §3 Modello dati, §12 Profilo
> Dipendenze: Blocco 1, Blocco 2

| Sotto-blocco | Stato | Note |
|---|---|---|
| 3a — Rename `ha_figli_a_carico` → `sono_un_figlio_a_carico` | ✅ | Migration 018, 46 occorrenze in 16 file |
| 3b — Campo `importo_lordo_massimale` + progress bar | ✅ | Migration 019, ProfileForm + PaymentOverview |
| 3c — Consolidamento OCCASIONALE (rimozione COCOCO/PIVA) | ✅ | Migration 020, rimozione P.IVA, aggiornamento e2e |

---

## Blocco 5 — Editing profilo responsabile_compensi + security fix + contratto profilo ✅

> Requisito: `docs/requirements.md` §5 — Modifica profilo responsabile_compensi
> Dipendenze: Blocco 4

| Sotto-blocco | Stato | Note |
|---|---|---|
| 5a — Security fix community check username | ✅ | `PATCH /api/admin/collaboratori/[id]` ora verifica community per responsabile |
| 5b — Nuovo endpoint PATCH profile | ✅ | `app/api/admin/collaboratori/[id]/profile/route.ts`, no IBAN, community-scoped |
| 5c — CollaboratoreDetail edit mode | ✅ | Form toggle con tutti i campi + username + CF normalization |
| 5d — Profile editing contract | ✅ | `docs/profile-editing-contract.md` + riferimento in CLAUDE.md |
| 5e — Username test user | ✅ | `collaboratore_test` assegnato a id `3a55c2da` |

---

## Blocco 4 — Username generation + validazioni CF/IBAN ✅

> Requisito: `docs/requirements.md` §4 — Username e validazioni
> Dipendenze: Blocco 1, Blocco 3

| Sotto-blocco | Stato | Note |
|---|---|---|
| 4a — Migration 021 + lib/username.ts | ✅ | `ADD COLUMN username TEXT UNIQUE`; `generateUsername` + `generateUniqueUsername` |
| 4b — create-user API + PATCH endpoint | ✅ | Auto-generation con suffix loop; explicit → 409; PATCH `/api/admin/collaboratori/[id]` |
| 4c — UI: badge + inline edit + form preview | ✅ | CollaboratoreDetail, ProfileForm, CreateUserForm (quick+full), OnboardingWizard |
| 4d — Validazioni server-side | ✅ | CF regex in profile+onboarding; IBAN regex in onboarding |

---

## Blocco 6 — Wizard rimborso 3-step + aggiornamento categorie ✅

> Requisito: `docs/requirements.md` §12 — Richiesta rimborso spese e ticket da compensi (Block 6)
> Dipendenze: Blocco 2, Blocco 3

| Sotto-blocco | Stato | Note |
|---|---|---|
| 6a — Migration 022 (descrizione nullable) | ✅ | `ALTER TABLE expense_reimbursements ALTER COLUMN descrizione DROP NOT NULL` |
| 6b — ExpenseForm wizard 3-step | ✅ | Step 1 (dati), Step 2 (allegati), Step 3 (riepilogo+conferma). Submit unico in Step 3. |
| 6c — EXPENSE_CATEGORIES aggiornate | ✅ | Trasporti, Vitto, Alloggio, Materiali, Cancelleria, Altro. API Zod aggiornato. |
| 6d — TICKET_CATEGORIES aggiornate | ✅ | Generale, Compensi, Documenti, Accesso, Altro. TicketQuickModal e TicketForm auto-aggiornati. |

---

## Blocco 7 — Refactor workflow compensi ✅

> Requisito: `docs/requirements.md` §4 — Workflow operativi
> Dipendenze: tutti i blocchi precedenti

| Sotto-blocco | Stato | Note |
|---|---|---|
| 7a — Migration 024 + types + state machine | ✅ | BOZZA rimosso, DEFAULT IN_ATTESA, `corso_appartenenza` aggiunto |
| 7b — UI components + pages | ✅ | StatusBadge, ActionPanel, CompensationList, CompensationDetail, page.tsx aggiornati |
| 7c — POST API + test + eliminazione file obsoleti | ✅ | POST riscritto responsabile/admin only; attachments rimossi; test aggiornati |

### Workflow implementato
```
Compensi:  IN_ATTESA → APPROVATO → LIQUIDATO  /  ↘ RIFIUTATO (rejection_note)
           RIFIUTATO → IN_ATTESA (reopen, collaboratore)
Rimborsi:  IN_ATTESA → APPROVATO → LIQUIDATO  /  ↘ RIFIUTATO
```

---

## Blocco 8 — Wizard carico compensi (responsabile) ✅

> Requisito: `docs/requirements.md` §4 — Creazione compensi da responsabile
> Dipendenze: Blocco 7

| Sotto-blocco | Stato | Note |
|---|---|---|
| 8a — GET /api/admin/collaboratori (ricerca) | ✅ | Scoped per community del responsabile, filtri q/community_id/active_only |
| 8b — CompensationCreateWizard (3-step) | ✅ | choice→cerca collab→dati (ritenuta 20% auto)→riepilogo+crea |
| 8c — /approvazioni/carica + bottone | ✅ | Server page con managedCommunities prop; bottone in /approvazioni |

---

## Blocco 9 — Finalizzazione sezione Collaboratore - Compensi e Rimborsi ✅

> Requisito: `docs/requirements.md` §13 — Sezione Compensi e Rimborsi (collaboratore)
> Dipendenze: Blocco 7, Blocco 8

| Sotto-blocco | Stato | Note |
|---|---|---|
| 9a — PaymentOverview redesign | ✅ | CompensazioniCard + RimborsiCard, verbose labels, ritenuta 20%, APPROVATO section, IN_ATTESA dimmed, massimale CTA link |
| 9b — CompenseTabs: tab Compensi | ✅ | PendingApprovedList card "Da ricevere", CompensationList chevron + tooltip netti, meta row (dot+community · Competenza · Inviato) |
| 9c — CompenseTabs: tab Rimborsi | ✅ | PendingApprovedExpenseList card "Da liquidare", ExpenseList date labels (Spesa/Inviato) + chevron |
| 9d — InfoTooltip client component | ✅ | useState hover + keyboard focus/blur, tabIndex=0, replaces broken CSS-only group/tip pattern (Tailwind v4 incompatibility) |
| 9e — Cleanup file obsoleti | ✅ | Rimossi: CompensationWizard.tsx, compensi/nuova/page.tsx, api/compensations/[id]/attachments/route.ts |
| 9f — TicketQuickModal CTA | ✅ | Trigger button → bg-blue-600 hover:bg-blue-500 text-white |
| 9g — Simplify review | ✅ | Object.entries per grouping functions; InfoTooltip keyboard support; formatDate/formatCurrency extraction → backlog S8 |

---

## Blocco 10 — Sezione Documenti Collaboratore ✅

> Requisito: `docs/requirements.md` — Sezione Documenti Collaboratore (Block 10)
> Dipendenze: Blocco 3 (rimozione COCOCO/PIVA), Blocco 9 (layout profilo)

| Sotto-blocco | Stato | Note |
|---|---|---|
| 10a — Migration 025 + DB cleanup | ✅ | RICEVUTA_PAGAMENTO rimossa; CHECK aggiornato; macro_type + unique index ricreati |
| 10b — lib/types.ts cleanup | ✅ | DocumentType/DocumentMacroType a 2 valori; rimozione RICEVUTA_PAGAMENTO da tutti i record |
| 10c — API validTipi | ✅ | `['CONTRATTO_OCCASIONALE', 'CU']` — 400 per COCOCO/PIVA/RICEVUTA |
| 10d — DocumentList dead code | ✅ | TypeBadge: rimossi casi COCOCO, PIVA, RICEVUTA; MACRO_ORDER aggiornato |
| 10e — DocumentUploadForm dropdown | ✅ | Dropdown semplificato a 2 opzioni flat (no optgroup) |
| 10f — profilo/page.tsx documenti tab | ✅ | DocumentUploadForm + CTA "Nuovo rimborso" → /rimborsi/nuova |

---

## Blocco 12 — Content Types Redesign ✅

> Requisito: `docs/requirements.md` — Block 12: Content Types
> Dipendenze: Blocco 11 (DashboardUpdates stub)

| Sotto-blocco | Stato | Note |
|---|---|---|
| 12a — Migration 026 | ✅ | Rename announcements→communications, benefits→discounts; nuove colonne; CREATE TABLE opportunities + RLS |
| 12b — TypeScript types | ✅ | Communication, Discount, Opportunity interfaces; ResourceCategoria, EventTipo, OpportunityTipo literal types |
| 12c — API routes | ✅ | /api/communications, /discounts, /opportunities (admin-only CRUD); /resources + /events aggiornati con nuovi campi |
| 12d — Admin /contenuti | ✅ | 5 tab (comunicazioni/sconti/risorse/eventi/opportunita); solo amministrazione; rimosso accesso responsabile |
| 12e — Read pages collaboratore | ✅ | /eventi, /eventi/[id], /comunicazioni, /comunicazioni/[id], /risorse/[id], /opportunita, /opportunita/[id], /sconti/[id] |
| 12f — Dashboard tabs | ✅ | 4 tab DashboardUpdates funzionanti; fetch paralleli in page.tsx; merge comms+risorse e opps+sconti |
| 12g — Feature additions | ✅ | Google Calendar link + Maps link in /eventi/[id]; CopyButton per codice sconto; filtro categoria in /comunicazioni?tab=risorse |

---

## Blocco 13 — Importazione compensi (responsabile_compensi) 🔄

> Requisito: docs/requirements.md — Block 13
> Dipendenze: Blocco 12

| Sotto-blocco | Stato | Note |
|---|---|---|
| 13a — Redesign sezione Compensi e rimborsi | ✅ | Nav rename, KPI, search, filtri, checkbox, bulk approve, Import stub disabilitato |
| 13b — Import XLS da URL esterno | 🔲 | 4 file target configurabili (tipologie TBD), parser XLS stub |

---

## Legenda

| Simbolo | Significato |
|---|---|
| ✅ | Completato: build ✅, unit test ✅, Playwright ⏸ sospeso (istruzione temporanea), checklist firmata, CLAUDE.md aggiornato |
| 🔄 | In corso (blocco attivo) |
| 🔲 | Non iniziato |
| ⏸ | Sospeso / bloccato da dipendenza |
