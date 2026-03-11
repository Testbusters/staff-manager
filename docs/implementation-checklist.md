# Staff Manager — Implementation Checklist

> Update this file at the end of every functional block (Phase 8 of the pipeline).
> This is the source of truth for project status. Read before starting a new block.
> Last updated 2026-03-11. Import Contratti ✅ (2026-03-11). Next: no block defined — ready to plan next block.

---

## Log

| Data | Blocco | Stato | Test | Note |
| 2026-03-11 | Import Contratti | ✅ | tsc ✅, build ✅, vitest 288/288 ✅, e2e ⏸ | lib/contratti-import-sheet.ts: getContrattiRows()+writeContrattiResults()+writeNomePdf(), tab=contratti, cols A–F. POST /api/import/contratti/preview: admin-only, V1–V6 validation (V1=nome_pdf empty→error, V2=file not in Drive→error, V3=username not in DB→blocking error, V4=existing CONTRATTO_OCCASIONALE→warning/skip, V5=silent PROCESSED skip, V6=year not extractable→warning), blockingUsernames gate. POST /api/import/contratti/run: stateless re-validate, Drive download → Storage upload → documents INSERT (tipo=CONTRATTO_OCCASIONALE, stato_firma=FIRMATO) → GSheet writeback (col E=PROCESSED, non-blocking) → import_runs tracking. ImportContrattiSection.tsx: Idle (SourceCard with Drive+Sheet links + instruction list), Preview (stats strip, blocking banner, filter tabs Tutti/Importabili/Già presenti/Errori, paginated table, Drive+Sheet links), Result (4 stat cards, collapsible errors, Nuovo import). ImportSection.tsx: Contratti tab → ImportContrattiSection (replaced coming-soon placeholder). scripts/match-contratti.mjs: one-shot Drive→GSheet nome_pdf matching — ran at block closure, matched 18/763 rows, wrote col F. Env: CONTRATTI_SHEET_ID, NEXT_PUBLIC_CONTRATTI_SHEET_ID, CONTRATTI_DRIVE_FOLDER_ID, NEXT_PUBLIC_CONTRATTI_DRIVE_FOLDER_ID. |
| 2026-03-10 | Monitoraggio tab | ✅ | tsc ✅, build ✅, vitest 288/288 ✅, e2e ⏸ | Migrations 043: import_runs + email_events + export_runs.duration_ms + get_recent_auth_events(). Migration 045: app_errors table + get_top_queries/get_table_stats/reset_query_stats (SECURITY DEFINER, extensions.pg_stat_statements). 7 new monitoring API routes (stats, access-log, operations, email-delivery, supabase-logs, db-stats, app-errors). POST /api/errors (public, best-effort). POST /api/webhooks/resend (HMAC-SHA256 Svix-format signature, RESEND_WEBHOOK_SECRET). Import/export run routes updated with duration_ms tracking + import_runs INSERT. MonitoraggioSection.tsx: 7 collapsible sections (SectionAccordion wrapper, chevron right), auto-refresh 60s + countdown, 'use client'. Impostazioni page: monitoraggio tab added, tab bar always full-width, content max-w-3xl only for narrow tabs. |
| 2026-03-10 | Import Collaboratori V2 + Community Single-select + Invite data_ingresso | ✅ | tsc ✅, build ✅, vitest 288/288 ✅, e2e ⏸ | Migration 043: UNIQUE constraint on collaborator_communities.collaborator_id. lib/import-sheet.ts: new A–I column layout (F=community, G=data_ingresso, H=password, I=note_errore); SheetUpdate interface; skip PROCESSED rows; filter moved to getImportSheetRows. preview/route.ts: community+data_ingresso validation (VALID_COMMUNITIES set + Date.parse check), alreadyProcessedCount removed. run/route.ts: community UUID map from communities table; collaborator_communities INSERT per row; skipContract flag (default true); E8 invite email fire-and-forget per row; SheetUpdate format (E=stato, H=password, I=note). ImportCollaboratoriSection: generateContract checkbox (default OFF), preview table +Community+Data ingresso cols, updated rules panel A–I, contract status in confirm modal, password note → col H. ProfileForm: community multiselect→single Select; handleSaveCommunities uses selectedCommunityId. api/profile/communities: reject community_ids.length>1 → 400. CreateUserForm: data_ingresso field in Rapido mode, disabled guard updated. api/admin/create-user: data_ingresso z.string().min(1). MonitoraggioSection: fix TS1005 parse error on quoted dotted string keys → computed property syntax. impostazioni/page.tsx: Monitoraggio tab wired (linter addition). |
| 2026-03-10 | Import CU | ✅ | tsc ✅, build ✅, vitest 288/288 ✅, e2e ⏸ | lib/cu-import-sheet.ts: GSheet helper (getImportCURows reads A:D, skips PROCESSED rows; writeCUImportResults batchUpdate C+D). lib/google-drive.ts: buildFolderMap(folderId) with pagination + downloadFile(fileId); retry on 429/503. POST /api/import/cu/preview: admin-only, V1–V7 validation, batch DB username lookup, Drive folder map, blockingUsernames[] for confirm gate. POST /api/import/cu/run: stateless re-validate, batch 5/600ms delay, V8 duplicate skip, Drive download → Storage upload → documents INSERT → in-app notification (cu_disponibile) → GSheet writeback (non-blocking). ImportCUSection.tsx: Idle (SourceCard + Avvia anteprima), Preview (stats strip 4 cols, blocking banner collapsible, filter tabs Tutti/Valide/Warning/Errori, paginated table 50/page, action bar), Result (4 stat cards, collapsible error list, CSV download, Nuovo import). ImportSection.tsx: CU tab → ImportCUSection; Contratti tab → inline coming-soon (EmptyState removed). Env: CU_SHEET_ID, CU_SHEET_TAB, CU_DRIVE_FOLDER_ID, NEXT_PUBLIC_CU_SHEET_ID. |
| 2026-03-10 | Massimale Fix + Bulk Queue + Error Pages | ✅ | tsc ✅, build ✅, vitest 288/288 ✅, e2e ⏸ | Migration 042: approved_lordo_ytd + approved_year on collaborators (backfill from APPROVATO compensations+expenses). lib/massimale.ts: getYtd() (lazy year reset) + isOverMassimale(). MassimaleCheckModal: already_approved field added to MassimaleImpact type. All 4 approve routes updated with server-side YTD check (bulk-approve + [id]/transition for both compensations and expenses). CodaCompensazioni/CodaRimborsi: removed client-side checkMassimale(), toast.loading for bulk approve, bulk receipt confirmation Dialog. app/(app)/page.tsx: paidCurrentYear now reads approved_lordo_ytd (with year guard). app/(app)/error.tsx created (ServerCrash icon, bg-brand CTA). app/error.tsx + app/not-found.tsx already existed. |
| 2026-03-10 | Impostazioni Collaboratori — Search + Modal | ✅ | tsc ✅, build ✅, vitest 288/288 ✅, e2e ⏸ | GET /api/admin/members: search ?q=, pagination ?page/?limit=20, role=collaboratore filter (excludes admin/responsabile), returns email/username/data_ingresso. PATCH /api/admin/members/[id]: new combined endpoint (member_status + is_active + data_ingresso). MemberStatusManager full rewrite: self-contained client, debounced search (300ms), 5-col table (Nome/Email/Accesso badge/Data ingresso/Modalità uscita badge), Dialog editor with is_active toggle + Modalità uscita select (attivo hidden, shown as "Nessuna uscita programmata") + data_ingresso input, AlertDialog on downgrade (red Conferma). Audit fixes: single-fetch on mount (suppressPageEffect+isMounted refs), dead code removed (STATUS_DOT/STATUS_LABELS), keyboard-accessible rows (role=button+onKeyDown), skeleton matches 5-col layout, AlertDialog destructive styling. Removed SSR members fetch from impostazioni/page.tsx. Updated page subtitle. |
| 2026-03-09 | Import Collaboratori | ✅ | tsc ✅, build ✅, vitest 288/288 ✅, e2e ⏸ | lib/import-sheet.ts: Google Sheets helper (getImportSheetRows + writeImportResults, col E=stato, F=note, G=password). POST /api/import/collaboratori/preview: validates all sheet rows (email/username uniqueness vs DB + batch duplicates, format, max 1000). POST /api/import/collaboratori/run: batch-create auth users + user_profiles (skip_contract_on_onboarding=true, must_change_password=true) + collaborators; writes IMPORTED/ERROR+password to sheet. ImportCollaboratoriSection: sheet link card, inline ImportRulesPanel (sticky right column), PreviewTable with per-row badges, ConfirmImportModal (simplified), RunResultPanel. ImportSection: wired to ImportCollaboratoriSection; Contratti/CU → coming-soon EmptyState. Page: removed max-w-5xl. Env: IMPORT_COLLABORATORI_SHEET_ID + NEXT_PUBLIC_IMPORT_COLLABORATORI_SHEET_ID. Scripts: extract-wp-to-sheet.mjs, validate-collaboratori.mjs, import-collaboratori.mjs (one-shot migration tools). |
| 2026-03-09 | Import Section UI Scaffolding | ✅ | tsc ✅, build ✅, vitest n/a (scaffold), e2e ⏸ | New `/import` route (admin-only). `ImportSection.tsx`: 3 outer tabs (Collaboratori/Contratti/CU) + 2 inner sub-tabs (Anteprima/Storico), GSheet URL input, disabled CTAs, EmptyState per sub-tab. Outer tab switch resets inner state + URL. Nav entry with `comingSoon` toggle. Files: lib/nav.ts, app/(app)/import/page.tsx, app/(app)/import/loading.tsx, components/import/ImportSection.tsx, docs/sitemap.md. |
| 2026-03-09 | Email Template Management | ✅ | tsc ✅, build ✅, vitest 288/288 ✅, e2e ⏸ | Migration 041: email_templates (12 rows seeded) + email_layout_config. lib/email-template-service.ts: getRenderedEmail() with DB fetch, {{marker}} substitution, 5min layout cache, hardcoded fallback. GET/PATCH /api/admin/email-templates, /[key], /api/admin/email-layout. EmailTemplateManager 3-panel UI (navigator/editor/preview iframe), EmailLayoutEditor 2-column form. Impostazioni: new "Template mail" tab, conditional max-w removal. All 11 email send routes updated (fire-and-forget preserved). |
| 2026-03-09 | Documenti Admin Revision | ✅ | tsc ✅, build ✅, vitest 288/288 ✅, e2e ⏸ | RICEVUTA_PAGAMENTO added to list MACRO_ORDER, upload wizard, API validTipi. Admin redirect /documenti/[id] → /documenti. DocumentDeleteButton removed; delete action no longer exposed in UI. DocumentAdminModal: lazy fetch, file upload/replace, DA_FIRMARE→FIRMATO optional transition, CTA label adapts to file presence. PATCH /api/documents/[id]: file replacement + optional stato_firma update. DocumentUploadForm rewritten 3-step wizard (search-first collab, metadata with anno auto-fill, file+preview). Admin document list rewritten as 2-step wizard (lazy fetch per collab — no heavy query at mount). Collab banner: profile avatar with initials fallback. |
| 2026-03-09 | Password Management + Skip Contract Flag | ✅ | tsc ✅, build ✅, vitest 288/288 ✅, e2e ⏸ | Migration 040: skip_contract_on_onboarding boolean on user_profiles. lib/password.ts: shared generatePassword() (extracted from create-user). POST /api/profile/password (collaboratore self-service). POST /api/admin/collaboratori/[id]/password (admin reset). PasswordChangeForm in /profilo Sicurezza section (collaboratore only). ResetPasswordDialog in CollaboratoreDetail header (admin only, auto-generates password). onboarding/complete: skips contract generation when flag=true, resets flag after completion. |
| 2026-03-09 | Collaboratori UX Redesign | ✅ | tsc ✅, build ✅, e2e ⏸ | CodaReceiptButton → primary. Collaboratori lista: filtro solo ruolo collaboratore, search debounced (nome/cognome/username/email), layout colonne distribuite (nome·email·contratto·tel·community), count badge, avatar con foto profilo + fallback iniziali no-flash (CollaboratorAvatar client component). Collaboratori dettaglio: header redesign con avatar XL + status + @username + community, edit → Dialog modale (tutti i campi admin), compensi/rimborsi rimossi, documenti redesign full width. Server page: rimossi fetch inutilizzati. DB: zero migrazioni. |
| 2026-03-09 | Admin UX Polish | ✅ | tsc ✅, build ✅, vitest 288/288 ✅, e2e ⏸ | CreateUserForm: required fields (email, username, data_fine_contratto + full-mode anagrafica) with * labels + button disabled gating. CommunityManager: window.confirm → AlertDialog, text links → Button CTAs, toast feedback. MemberStatusManager: card layout → table with status dot indicator, explicit Save button (appears only when date is dirty). FeedbackActions: window.confirm → AlertDialog. FeedbackPageClient: extracted from page.tsx, bulk action bar (Completa/Rimuovi tutti), select-all Button per section, checkbox on left of card with selection highlight. RichTextEditor: text labels → Lucide icons (Bold/Italic/Heading2/Heading3/List/ListOrdered) + Tooltip groups. All 5 contenuti lists (Communication/Event/Discount/Opportunity/Resource): primary Button CTA, Dialog for create/edit, AlertDialog for delete, success toasts. AdminDashboard: removed quick actions strip (Vai alla coda/Export/Carica documento/Crea utente). |
| 2026-03-09 | Toast Notification System (Sonner) | ✅ | tsc ✅, build ✅, vitest 264/264 ✅, e2e ⏸ | Sonner installed via shadcn CLI. Toaster added to app/(app)/layout.tsx + app/login/layout.tsx (position=bottom-right, default 3s, errors 5s). 31 component files converted: all inline useState(error/success) → toast.error/toast.success. Exceptions preserved: login inline error, CreateUserForm credentials panel, FeedbackButton modal success state, CUBatchUpload batch result panel, OnboardingWizard download URL. Group C: CodaCompensazioni+CodaRimborsi now show toast.success with count on bulk approve/liquidate. |
| 2026-03-09 | Digital Signature + Payment Receipt | ✅ | tsc ✅, build ✅, vitest 288/288 ✅ (23 new in digital-signature.test.ts), e2e ⏸ | Migration 039: RICEVUTA_PAGAMENTO tipo, receipt_document_id FK on compensations+expenses, data_fine_contratto on collaborators. lib/pdf-utils.ts: findMarkerPositions (pdfjs-dist v5 legacy) + fillPdfMarkers (pdf-lib). lib/document-generation.ts: buildContractVars + buildReceiptVars + generateDocumentFromTemplate. SignatureCanvas + SignaturePad + DocumentViewer components. DocumentSignFlow full redesign (guided canvas/image + download modes). API routes: sign-guided, recompile, receipts/preview, generate-receipts (bulk+single). Onboarding: replaced docxtemplater with PDF generation. Coda: single-liquidation confirmation dialog with auto-receipt. Admin: dual template slots (Contratto+Ricevuta) + data_fine_contratto in CreateUserForm. Contract template replaced with contratto_collaboratore_ocasionale.pdf (210 KB). |
| 2026-03-06 | Coda lavoro — Full lifecycle redesign | ✅ | tsc ✅, build ✅, vitest 252/252 ✅, e2e ⏸ | Full redesign: fetch all stati (IN_ATTESA/APPROVATO/RIFIUTATO/LIQUIDATO) with two-step collab join. CodaCompensazioni + CodaRimborsi: shadcn Table (proper horizontal layout), 3-card stats strip (count+total per stato), left accent stripe per stato, sub-filter pills ×5, sort by date (cycle asc→desc→none), footer totals row, approve/reject/liquidate per row + bulk. MassimaleCheckModal: collapsible per-collaborator impact cards + eccedenza totale. POST /api/compensations/bulk-approve, /bulk-liquidate, /api/expenses/bulk-approve, /bulk-liquidate (admin-only). Files: app/(app)/coda/page.tsx, loading.tsx, components/admin/CodaCompensazioni.tsx, CodaRimborsi.tsx, MassimaleCheckModal.tsx, 4 bulk API routes. |
| 2026-03-06 | Export GSheet redesign | ✅ | tsc ✅, build ✅, vitest 264/264 ✅, e2e ⏸ | Migration 038: exported_at on compensations+expenses, export_runs table, exports bucket. Rewritten lib/export-utils (groupToCollaboratorRows, formatDate/Euro, toGSheetRow 15-col, buildHistoryXLSXWorkbook). lib/google-sheets: +writeExportRows (append to GOOGLE_SHEET_EXPORT_ID). POST /api/export/gsheet (full flow: fetch→aggregate→GSheet push→stamp→XLS upload→record run). GET /api/export/history (last 50 runs + signed URLs). UI: ExportSection (Anteprima/Storico tabs), ExportPreviewTable (per-collaborator aggregated), ExportHistoryTab (run list + XLS download). 18 unit tests. |
| 2026-03-06 | Admin dashboard — Feed removal + pagination fix | ✅ | tsc ✅, build ✅, vitest 252/252 ✅, e2e ⏸ | Removed "Attività recenti" feed section (FeedRow, search/filter state, Select import, communities field from AdminDashboardData + dashData). Pagination aligned right with compact arrows (justify-end gap-1). Files: components/admin/AdminDashboard.tsx, components/admin/types.ts, app/(app)/page.tsx. |
| 2026-03-06 | Admin dashboard — Community section redesign | ✅ | tsc ✅, build ✅, vitest 252/252 ✅, e2e ⏸ | Replaced static CommunityCard with interactive 2-column CommunityColumn layout. 3 filter tabs per column (Compensi/Rimborsi/Da firmare) with active counts. Record list with StatusBadge + amount/date. Pagination (PAGE_SIZE=20). Community data via new Promise.all (communityCompsRes/expsRes/docsRes/collabsRes). communityCollabMap replaces collabCommRes. Removed: CommunityCard, UrgentRow, urgentItems, collabBreakdown, AdminCollabBreakdown, AdminUrgentItem types. Files: components/admin/types.ts, app/(app)/page.tsx, components/admin/AdminDashboard.tsx. |
| 2026-03-06 | Rifinitura collab+responsabile | ✅ | tsc ✅, build ✅, vitest 252/252 ✅, e2e ⏸ | Item 1: avatar URL cache bust (?t=). Item 2: PATCH /api/profile/communities (collab self-edit) + ProfileForm community checkboxes. Item 3: profile field reorder (indirizzo→Informazioni personali, email→Contatti) in ProfileForm+OnboardingWizard+CreateUserForm. Item 4: sidebar badge "In arrivo". Item 5: ResponsabileAvatarHero client component with upload. Item 6: CompensationEditModal auto-calc ritenuta (read-only), no user input. |
|---|---|---|---|---|
| 2026-03-05 | Compensation edit + bulk UI removal | ✅ | tsc ✅, build ✅, vitest 252/252 ✅, e2e ⏸ | Feature A: PATCH /api/compensations/[id]/edit + GET /api/compensations/competenze + CompensationEditModal + ActionPanel "Modifica" CTA (admin + responsabile_compensi, stato=IN_ATTESA only) + compensation_history edited event with field diff. Feature B: rimossi checkbox, select-all, bulk bar da ApprovazioniCompensazioni (pagina responsabile-only). |
| 2026-03-04 | Blocco 15c — UI integrations (T0–G2) | ✅ | tsc ✅, build ✅, vitest 252/252 ✅, e2e ⏸ (spec block15c.spec.ts creata, sospesa) | T0: priority select in TicketQuickModal. T1: CollabOpenTicketsSection + TicketDetailModal (collab dashboard). T2: TicketStatusBadge colori + data-ticket-stato. R1: guard responsabile_compensi in ActionPanel + ExpenseActionPanel. R2: DashboardPendingItems (comp/rimborso modali). R3: rimossi CTA hero responsabile. G1: tab DashboardUpdates riordinati. G2: row click in PendingApprovedList, PendingApprovedExpenseList, TicketList. Fix: hover:bg-gray-800 su tutte le righe interattive. Fix: DashboardTicketSection → full-row Link, inline reply rimosso. Fix: ExpModal d.expense → d.reimbursement. |
| 2026-03-05 | UI Kit Phase A — Token alignment + Light/Dark toggle | ✅ | tsc ✅, build ✅, vitest 252/252 ✅, e2e ⏸ | Migration 035: theme_preference in user_profiles. themes.css: --base-* scale from UI kit. globals.css: semantic tokens → var(--base-*). next-themes ThemeProvider (root, default light). ThemeSync syncs DB preference on mount. Sidebar toggle (sun/moon, bottom near avatar). PATCH /api/profile/theme. Login always light via setTheme('light') on mount. |
| 2026-03-05 | shadcn Fase 9 — Cleanup finale | ✅ | tsc ✅, build ✅, vitest 252/252 ✅ | Delete docs/shadcn-migration.md. Update docs/ui-components.md (all components ✅). Update CLAUDE.md (remove migration ref, mark complete). Fase 5 Table + DropdownMenu/Tabs/Pagination/Skeleton remain as future work. e2e Phase 4/4b re-enabled for future blocks. |
| 2026-03-04 | shadcn Fase 8 — Button audit | ✅ | tsc ✅, build ✅, vitest 252/252 ✅, e2e ⏸ | Primary CTAs migrated to shadcn Button in 17 files. Blue override pattern: className="bg-blue-600 hover:bg-blue-500 text-white" on variant="default". variant="outline"/"ghost" for cancel/secondary, variant="destructive" for reject modals, size="sm" for compact inline forms (CommunityManager, CollaboratoreDetail, contenuti). Skipped: floating FeedbackButton trigger, utility/toggle buttons, pagination, table row status buttons. |
| 2026-03-04 | shadcn Fase 7 — Select migration | ✅ | tsc ✅, build ✅, vitest 252/252 ✅, e2e ⏸ | 20 native `<select>` replaced with shadcn Select across 15 files. Pattern A (required), Pattern B (optional — value\|\|undefined + placeholder), sentinel 'all' for community filters. Removed selectCls/inputCls consts from 5 files. |
| 2026-03-04 | shadcn Fase 6 — Input/Textarea migration | ✅ | tsc ✅, build ✅, vitest 252/252 ✅, e2e ⏸ | All `<input>` and `<textarea>` replaced with shadcn `Input`/`Textarea` across 20 files. Remaining `<select>` → Fase 7. ProfileForm tshirt select: inline className (Fase 7). DocumentUploadForm `inputCls` kept for select (Fase 7). |
| 2026-03-04 | shadcn QW1+QW2 — AlertDialog logout + data-stato + Turbopack CSS fix | ✅ | tsc ✅, build ✅, vitest 252/252 ✅, e2e ⏸ | QW1: Sidebar logout modal → AlertDialog (rimosso useState). QW2: data-stato={stato} su StatusBadge. Fix: tooltip.tsx ripristinato. Fix: tw-animate-css + shadcn/tailwind.css vendorizzati in app/ (Turbopack non supporta "style" export condition). |
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
| 2026-03-02 | Blocco 13 — Notification System Overhaul | ✅ | tsc ✅, build ✅, vitest 202/202 ✅ (35 nuovi in notifications-block13.test.ts), e2e ⏸ (sospeso), smoke test OK | Migration 027: rimozione integrazioni event_keys, aggiunta documento_firmato:amministrazione, email ticket reply abilitata, 4 content event_keys. New builders: buildContentNotification (4 tipi), buildCompensationReopenNotification. Helper: getAllActiveCollaboratori (broadcast). Email E9–E12. NotificationBell: TYPE_BADGE 8 tipi + formatRelativeTime + message truncation. NotificationSettingsManager: rimozione integrazioni, sezione Contenuti. /notifiche: type filter chips (8 tipi) + "Solo non lette" in header. API entity_type filter. DashboardUpdates: colored badges per content type. 7 API routes aggiornate (comp reopen, ticket reply, doc sign, 4 content POST). |
| 2026-03-02 | Blocco 14 — Rich Text Editor + Notification Alerts | ✅ | tsc ✅, build ✅, vitest 202/202 ✅, e2e 3/3 ✅ (block14.spec.ts), smoke test OK | No DB migration. Tiptap 3 (@tiptap/react @tiptap/pm @tiptap/starter-kit). New components: RichTextEditor (toolbar B/I/H2/H3/bullet/ordered, immediatelyRender:false), RichTextDisplay (dangerouslySetInnerHTML + toSafeHtml backward compat + Tailwind dark prose styles). 5 admin list components (textarea→RichTextEditor). 5 detail pages (whitespace-pre-wrap→RichTextDisplay). Email E10/E11/E12: optional contenuto/descrizione param + htmlSection() sanitizer. discounts route: add email dispatch. NotificationBell: prevUnreadRef detects increase → Web Audio ping (880→1174Hz, 0.5s) + bell-pulse animation. globals.css: @keyframes bell-pulse. |
| 2026-03-03 | Blocco 13b — Schema alignment + GSheet import + Individual form | ✅ | tsc ✅, build ✅, vitest 182/182 ✅ (15 nuovi in compensation-import.test.ts), e2e ⏸ (sospeso), smoke test OK | Migration 030: rename descrizione→nome_servizio_ruolo, note_interne→info_specifiche; DROP corso_appartenenza; community_id nullable; CREATE compensation_competenze + 4 seed; ADD competenza FK; rewrite responsabile RLS (collaborator_id-based). lib/types.ts Compensation aggiornato. 6 consumer aggiornati. lib/google-sheets.ts wrapper (fetchPendingRows + markRowsProcessed). /api/compensations/import/preview + /confirm. ImportSection.tsx sostituisce placeholder. CompensationCreateWizard: +competenza dropdown, +info_specifiche, -community_id field, -choice step. |
| 2026-03-03 | Fix + feature minori (post-B14) | ✅ | tsc ✅, build ✅ | Rimozione "Apri ticket" da Azioni rapide collaboratore (duplicato). Untracked da git: CLAUDE.md, playwright-report/, test-results/, supabase/.temp/ (aggiornato .gitignore). README: fix ha_figli_a_carico→sono_un_figlio_a_carico e contatore notifiche 15→19. Badge contatori non letti su DashboardUpdates tabs (Event/Comm/Opp+Disc) con mark-read server-side nelle detail pages. |
| 2026-03-03 | Fix — Ticket categories (semplificazione) | ✅ | tsc ✅, build ✅, vitest 202/202 ✅ | Migration 028: DELETE ticket non-conformi, UPDATE 'Compensi'→'Compenso', ADD CONSTRAINT tickets_categoria_check. TICKET_CATEGORIES=['Compenso','Rimborso']. Label UI "Categoria"→"Riferimento" in TicketForm, TicketQuickModal, TicketList, email template. |
| 2026-03-03 | Community targeting for content | ✅ | tsc ✅, build ✅, vitest 202/202 ✅, e2e ⏸ (sospeso), smoke test OK | Migration 029: `community_id UUID` → `community_ids UUID[] DEFAULT '{}'` on all 5 content tables (communications, events, opportunities, discounts, resources). `lib/types.ts`: community_ids field on all 5 interfaces. 5 POST/PATCH API routes: array field + targeted notifications via `getCollaboratoriForCommunities()`. 5 admin form components: multi-select checkboxes (empty = all communities). 3 collaborator list pages: in-memory community filter. 5 detail pages: community access check → notFound(). Dashboard: `contentVisible()` filter on feed. `lib/notification-helpers.ts`: `getCollaboratoriForCommunities()` helper. |
| 2026-03-03 | Feedback management | ✅ | tsc ✅, build ✅, vitest 217/217 ✅ | Migration 031: ADD COLUMN `stato TEXT NOT NULL DEFAULT 'nuovo' CHECK (stato IN ('nuovo','completato'))` on feedback + `feedback_admin_update` RLS policy. API `PATCH /feedback/[id]` (completato) + `DELETE /feedback/[id]` (hard delete + storage cleanup). `FeedbackActions` client component. Feedback page: two structured sections Nuovi/Completati with count badges + divider. |
| 2026-03-03 | Revisione sezione Compensi e Rimborsi | ✅ | tsc ✅, build ✅, vitest 217/217 ✅ | No DB migration. 3 unified KPI cards per stato (IN_ATTESA/APPROVATO/LIQUIDATO — count large + lordo medium) replacing 4 split cards. Two stacked creation-mode cards (manual blue CTA + GSheet ImportSection). Community dot removed from ApprovazioniCompensazioni rows and CompensationList rows. PAGE_SIZE 20 on all 4 components (ApprovazioniCompensazioni, ApprovazioniRimborsi, CompensationList, ExpenseList); CompensationList and ExpenseList had pagination added from scratch. |
| 2026-03-03 | Revisione sezione Rimborsi | ✅ | tsc ✅, build ✅, vitest 217/217 ✅ | No DB migration. ApprovazioniRimborsi: 3 unified KPI cards (IN_ATTESA/APPROVATO/LIQUIDATO with count+importo), categoria filter chip row, EXPENSE_CATEGORIA_BADGE colored badges on rows, importo totale selezionati in bulk bar, remove community dot + communities(name) from query. ExpenseDetail: colored categoria badge in header, collaborator name (role-gated admin/responsabile), "Richiesta il" timestamp row, attachment upload timestamps. rimborsi/[id]/page.tsx: fetch collaborator, enrich expense_history with changed_by_name (role-gated). Timeline: render "Nome Cognome (Ruolo)" when changed_by_name present. ExpenseForm: attachment mandatory in Step 2 (disabled gate + label). lib/types.ts: HistoryEvent.changed_by_name?, EXPENSE_CATEGORIA_BADGE. |
| 2026-03-03 | Dashboard ruolo responsabile_compensi | ✅ | tsc ✅, build ✅, vitest 217/217 ✅, e2e ⏸ (sospeso), smoke test OK | No DB migration. Redesign completo dashboard responsabile: 4 KPI cards (Compensi in attesa/Rimborsi in attesa/Da liquidare/Ticket aperti). Two-column pending items (compensi oldest-first con competenza badge + collabName + importo_lordo; rimborsi oldest-first con categoria badge + collabName + importo). DashboardTicketSection (client component): lista ticket aperti + inline reply textarea → POST FormData /api/tickets/:id/messages → router.refresh(). Azioni rapide: Approvazioni/Collaboratori/Ticket. Dead code rimosso: CommStat, FeedItem, FEED_ICONS, FeedRow, CommCard, "Cosa devo fare", "Ultimi aggiornamenti". Nav: Dashboard (🏠, href /, prima posizione) aggiunto per responsabile_compensi — pagina default su login. Documenti rimosso da nav responsabile_compensi; redirect → / in documenti/page.tsx e documenti/[id]/page.tsx; canUpload ora admin-only. COMP_COMPETENZA_BADGE (corsi/sb/produzione_materiale/extra). |
| 2026-03-04 | Blocco 15a — Ticket system overhaul | ✅ | tsc ✅, build ✅, vitest 252/252 ✅ (35 nuovi in tickets-block15a.test.ts), e2e 8/8 ✅ (tickets-block15a.spec.ts) | Migration 034: tickets_manager_read (creator_user_id→collaborators→collaborator_communities→user_community_access join, fixes NULL community_id), tickets_admin_read, 4 denorm columns (updated_at, last_message_at, last_message_author_name/_role). Priority field (BASSA/NORMALE/ALTA) in TicketForm + API + all ticket lists (dot indicator). Auto IN_LAVORAZIONE on manager reply to APERTO ticket (messages/route.ts). TicketStatusInline: APERTO/IN_LAVORAZIONE → only CHIUSO (no → In lavorazione CTA). Chat-style TicketThread with localStorage "Nuovo" badge + signed attachment URLs. Manager two-list view (/ticket): ricevuti (sender) + recenti (last activity). Responsabile blocked from /ticket/nuova (redirect to /). DashboardTicketSection rewritten with ricevuti/recenti props + priority dots. Collab dashboard: priority dot on open ticket rows. |

---

## Blocco 1 — Revisione ruoli e utenze di test ✅

> Requirement:`docs/requirements.md` §2 — Ruoli e permessi, Utenze di test
> Dependencies: none

| Sotto-blocco | Stato | Note |
|---|---|---|
| 1a — Type system + migration DB | ✅ | `lib/types.ts` + `017_roles_rename.sql` |
| 1b — Mass replace `responsabile` nel codice | ✅ | ~40 file aggiornati |
| 1c — Login page + E2E credentials | ✅ | `login/page.tsx` + 20 spec files aggiornati |

### Sub-block 1a — Type system and migration

**`lib/types.ts`**
- Remove `'responsabile'` from the `Role` type
- Add `'responsabile_cittadino'` | `'responsabile_compensi'` | `'responsabile_servizi_individuali'`
- Update `ROLE_LABELS`

**`supabase/migrations/017_roles_rename.sql`**
- Update `CHECK constraint` on `user_profiles.role` with new values
- `UPDATE user_profiles SET role = 'responsabile_compensi' WHERE role = 'responsabile'`
- Update all RLS policies referencing `'responsabile'`
- Rename existing test accounts:
  - `responsabile@test.com` → `responsabile_compensi@test.com`
  - `responsabile_test@test.com` → `responsabile_compensi_test@test.com`
  - `admin-test@example.com` → `admin@test.com`
- Create 4 new Supabase Auth users (password `Testbusters123`):
  - `responsabile_cittadino@test.com` (role: `responsabile_cittadino`)
  - `responsabile_servizi_individuali@test.com` (role: `responsabile_servizi_individuali`)
  - `responsabile_cittadino_test@test.com` (role: `responsabile_cittadino`)
  - `responsabile_servizi_individuali_test@test.com` (role: `responsabile_servizi_individuali`)

### Sub-block 1b — Mass replace in code

Core files:
- `lib/nav.ts` — key `responsabile` → `responsabile_compensi`
- `lib/compensation-transitions.ts` — `allowedRoles`
- `lib/expense-transitions.ts` — `allowedRoles`

API routes (~40 files) — all RBAC checks on `'responsabile'`:
- `app/api/compensations/`, `app/api/expenses/`, `app/api/documents/`
- `app/api/tickets/`, `app/api/announcements/`, `app/api/admin/`

UI components:
- `components/impostazioni/CreateUserForm.tsx` — role dropdown
- `components/impostazioni/CommunityManager.tsx` — responsabile → community assignment
- `components/responsabile/CollaboratoreDetail.tsx`, `TicketList.tsx`, `TicketMessageForm.tsx` — label display

Unit tests to update:
- `__tests__/compensation-transitions.test.ts`
- `__tests__/expense-transitions.test.ts`

### Sub-block 1c — Login page and E2E

**`app/login/page.tsx`** — update `TEST_USERS` array with the 9 accounts defined in §2

**`e2e/*.spec.ts`** (19 files) — replacements:
- `responsabile@test.com` → `responsabile_compensi@test.com`
- `admin-test@example.com` → `admin@test.com`

### Open points
- `responsabile_cittadino`: permissions, navigation and visibility → to be defined in a dedicated block
- `responsabile_servizi_individuali`: same

---

## Blocco 2 — Ristrutturazione menu collaboratore ✅

> Requirement:`docs/requirements.md` §3 — Navigazione collaboratore
> Dependencies:Blocco 1

| Sotto-blocco | Stato | Note |
|---|---|---|
| 2a — Nav 8 voci + comingSoon flag | ✅ | `lib/nav.ts` + `components/Sidebar.tsx` |
| 2b — Profilo e Documenti (tab merge) | ✅ | `profilo/page.tsx` + redirect `documenti/page.tsx` |
| 2c — Compensi e Rimborsi unificati | ✅ | `compensi/page.tsx` rewrite + `TicketQuickModal` |
| 2d — Rimozione CTA creazione compenso | ✅ | `CompensationList.tsx`, `page.tsx` dashboard, `compensi/nuova/page.tsx` |
| 2e — Nuove pagine: eventi, comunicazioni, opportunita | ✅ | 3 nuove route, read-only |

---

## Blocco 3 — Correzioni sezione profilo + consolidamento OCCASIONALE ✅

> Requirement:`docs/requirements.md` §3 Modello dati, §12 Profilo
> Dependencies:Blocco 1, Blocco 2

| Sotto-blocco | Stato | Note |
|---|---|---|
| 3a — Rename `ha_figli_a_carico` → `sono_un_figlio_a_carico` | ✅ | Migration 018, 46 occorrenze in 16 file |
| 3b — Campo `importo_lordo_massimale` + progress bar | ✅ | Migration 019, ProfileForm + PaymentOverview |
| 3c — Consolidamento OCCASIONALE (rimozione COCOCO/PIVA) | ✅ | Migration 020, rimozione P.IVA, aggiornamento e2e |

---

## Blocco 5 — Editing profilo responsabile_compensi + security fix + contratto profilo ✅

> Requirement:`docs/requirements.md` §5 — Modifica profilo responsabile_compensi
> Dependencies:Blocco 4

| Sotto-blocco | Stato | Note |
|---|---|---|
| 5a — Security fix community check username | ✅ | `PATCH /api/admin/collaboratori/[id]` ora verifica community per responsabile |
| 5b — Nuovo endpoint PATCH profile | ✅ | `app/api/admin/collaboratori/[id]/profile/route.ts`, no IBAN, community-scoped |
| 5c — CollaboratoreDetail edit mode | ✅ | Form toggle con tutti i campi + username + CF normalization |
| 5d — Profile editing contract | ✅ | `docs/profile-editing-contract.md` + riferimento in CLAUDE.md |
| 5e — Username test user | ✅ | `collaboratore_test` assegnato a id `3a55c2da` |

---

## Blocco 4 — Username generation + validazioni CF/IBAN ✅

> Requirement:`docs/requirements.md` §4 — Username e validazioni
> Dependencies:Blocco 1, Blocco 3

| Sotto-blocco | Stato | Note |
|---|---|---|
| 4a — Migration 021 + lib/username.ts | ✅ | `ADD COLUMN username TEXT UNIQUE`; `generateUsername` + `generateUniqueUsername` |
| 4b — create-user API + PATCH endpoint | ✅ | Auto-generation con suffix loop; explicit → 409; PATCH `/api/admin/collaboratori/[id]` |
| 4c — UI: badge + inline edit + form preview | ✅ | CollaboratoreDetail, ProfileForm, CreateUserForm (quick+full), OnboardingWizard |
| 4d — Validazioni server-side | ✅ | CF regex in profile+onboarding; IBAN regex in onboarding |

---

## Blocco 6 — Wizard rimborso 3-step + aggiornamento categorie ✅

> Requirement:`docs/requirements.md` §12 — Richiesta rimborso spese e ticket da compensi (Block 6)
> Dependencies:Blocco 2, Blocco 3

| Sotto-blocco | Stato | Note |
|---|---|---|
| 6a — Migration 022 (descrizione nullable) | ✅ | `ALTER TABLE expense_reimbursements ALTER COLUMN descrizione DROP NOT NULL` |
| 6b — ExpenseForm wizard 3-step | ✅ | Step 1 (dati), Step 2 (allegati), Step 3 (riepilogo+conferma). Submit unico in Step 3. |
| 6c — EXPENSE_CATEGORIES aggiornate | ✅ | Trasporti, Vitto, Alloggio, Materiali, Cancelleria, Altro. API Zod aggiornato. |
| 6d — TICKET_CATEGORIES aggiornate | ✅ | ~~Generale, Compensi, Documenti, Accesso, Altro~~ → **Compenso, Rimborso** (semplificato 2026-03-03, migration 028). Label "Categoria"→"Riferimento". |

---

## Blocco 7 — Refactor workflow compensi ✅

> Requirement:`docs/requirements.md` §4 — Workflow operativi
> Dependencies:tutti i blocchi precedenti

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

> Requirement:`docs/requirements.md` §4 — Creazione compensi da responsabile
> Dependencies:Blocco 7

| Sotto-blocco | Stato | Note |
|---|---|---|
| 8a — GET /api/admin/collaboratori (ricerca) | ✅ | Scoped per community del responsabile, filtri q/community_id/active_only |
| 8b — CompensationCreateWizard (3-step) | ✅ | choice→cerca collab→dati (ritenuta 20% auto)→riepilogo+crea |
| 8c — /approvazioni/carica + bottone | ✅ | Server page con managedCommunities prop; bottone in /approvazioni |

---

## Blocco 9 — Finalizzazione sezione Collaboratore - Compensi e Rimborsi ✅

> Requirement:`docs/requirements.md` §13 — Sezione Compensi e Rimborsi (collaboratore)
> Dependencies:Blocco 7, Blocco 8

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

> Requirement:`docs/requirements.md` — Sezione Documenti Collaboratore (Block 10)
> Dependencies:Blocco 3 (rimozione COCOCO/PIVA), Blocco 9 (layout profilo)

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

> Requirement:`docs/requirements.md` — Block 12: Content Types
> Dependencies:Blocco 11 (DashboardUpdates stub)

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

## Blocco 13a — Compensi e rimborsi responsabile (redesign) ✅

> Requirement:`docs/requirements.md` — Block 13: 13a
> Dependencies:Blocco 12

| Sotto-blocco | Stato | Note |
|---|---|---|
| 13a-I — approvazioni/page.tsx | ✅ | Fetch tutti gli stati + join collaborators; 4 KPI cards server-side; 2 tab (Compensi/Rimborsi) |
| 13a-II — ApprovazioniCompensazioni | ✅ | Search LIKE, filtri stato, checkbox, bulk approve bar, Import section disabilitata, paginazione 25/p |
| 13a-III — ApprovazioniRimborsi | ✅ | Stessa struttura senza Import section |
| 13a-IV — approve-bulk routes | ✅ | POST /api/compensations/approve-bulk + /api/expenses/approve-bulk (community-scoped + history) |
| 13a-V — nav rename | ✅ | Approvazioni → Compensi e rimborsi in lib/nav.ts |

---

## Blocco 13 — Notification System Overhaul ✅

> Requirement:`docs/requirements.md` — Block 13: Notifications
> Dependencies:Blocco 12 (content types), Blocco 10 (documenti), Blocco 9 (compensi)

| Sotto-blocco | Stato | Note |
|---|---|---|
| 13a — Migration 027 | ✅ | Rimozione comp_integrazioni/rimborso_integrazioni; aggiunta documento_firmato:amministrazione; email abilitata per ticket_risposta:collaboratore; 4 nuovi event_keys (comunicazione_pubblicata, evento_pubblicato, opportunita_pubblicata, sconto_pubblicato) |
| 13b — notification-utils.ts | ✅ | NotificationEntityType esteso a 8 tipi; ContentEntityType; buildCompensationReopenNotification; buildContentNotification |
| 13c — notification-helpers.ts | ✅ | getAllActiveCollaboratori (broadcast notifications per tutti i collaboratori attivi) |
| 13d — email-templates.ts | ✅ | E9 emailRispostaTicket, E10 emailNuovaComunicazione, E11 emailNuovoEvento, E12 emailNuovoContenuto (maschile/femminile per tipo) |
| 13e — NotificationBell.tsx | ✅ | TYPE_BADGE map (8 tipi, chip colorati); formatRelativeTime; content entity routing; message truncation (line-clamp-1) |
| 13f — NotificationSettingsManager.tsx | ✅ | Rimossi comp_integrazioni/rimborso_integrazioni; aggiunto documento_firmato in sezione Documenti; nuova sezione Contenuti con 4 event_keys; label Amministrazione aggiunta |
| 13g — API routes (7 route) | ✅ | compensations/[id]/transition (reopen notify); tickets/[id]/messages (E9 email); documents/[id]/sign (settings-driven); communications/route.ts (broadcast); events/route.ts (broadcast); opportunities/route.ts (broadcast); discounts/route.ts (in-app only) |
| 13h — notifications/route.ts | ✅ | entity_type filter param con VALID_ENTITY_TYPES whitelist (8 valori) |
| 13i — NotificationPageClient.tsx | ✅ | TYPE_BADGE map; type filter chips (8 tipi); "Solo non lette" in header; entityHref esteso a 8 tipi; max-w-2xl container |
| 13j — DashboardUpdates.tsx | ✅ | Colored badge constants (EVENT/COMM/RES/OPP/DISC); BADGE_BASE; applicati per tab (events=cyan, comm=green, res=blue, opp=indigo, disc=rose) |
| 13k — Unit tests | ✅ | 35 test in notifications-block13.test.ts: NotificationEntityType, buildContentNotification (4 tipi), buildCompensationReopenNotification, E9–E12, entity_type whitelist |

---

## Blocco 13b — Schema alignment + GSheet import + Individual form ✅

> Requirement:`docs/requirements.md` — Block 13: 13b-I/II/III
> Dependencies:Blocco 13a (compensation redesign), migration 030

| Sotto-blocco | Stato | Note |
|---|---|---|
| 13b-I — Migration 030 | ✅ | Rename descrizione→nome_servizio_ruolo, note_interne→info_specifiche; DROP corso_appartenenza; community_id nullable; CREATE compensation_competenze + RLS + seed; ADD competenza FK; rewrite responsabile RLS |
| 13b-II — lib/types.ts + consumers | ✅ | Compensation interface aggiornato; 6 consumer (CompensationDetail, CompensationList, PendingApprovedList, ApprovazioniCompensazioni, CompensationCreateWizard, route.ts) |
| 13b-III — GSheet import | ✅ | lib/google-sheets.ts (fetchPendingRows + markRowsProcessed); /api/compensations/import/preview + /confirm; ImportSection.tsx sostituisce placeholder |
| 13b-IV — CompensationCreateWizard | ✅ | +competenza select, +info_specifiche, -community_id field, -choice step; 2-step: collab search → dati + conferma |
| 13b-V — Unit tests | ✅ | 15 test in compensation-import.test.ts: parseDate, parseImporto, ritenuta calc |

---

## Blocco 14 — Rich Text Editor + Notification Alerts ✅

> Requirement:`docs/requirements.md` — Block 14: Rich Text Editor + Notification Alerts
> Dependencies:Blocco 12 (content types), Blocco 13 (notifications)

| Sotto-blocco | Stato | Note |
|---|---|---|
| 14a — RichTextEditor component | ✅ | Tiptap 3 (@tiptap/react @tiptap/pm @tiptap/starter-kit); toolbar B/I/H2/H3/bullet/ordered; immediatelyRender:false (SSR fix); useEffect sync external value |
| 14b — RichTextDisplay component | ✅ | dangerouslySetInnerHTML; toSafeHtml (backward compat for plain-text DB content); Tailwind dark prose arbitrary selectors |
| 14c — Admin list components (5) | ✅ | CommunicationList, EventList, OpportunityList, DiscountList, ResourceList: textarea→RichTextEditor; setRich helper; card list view→RichTextDisplay |
| 14d — Detail pages (5) | ✅ | comunicazioni/[id], eventi/[id], opportunita/[id], sconti/[id], risorse/[id]: whitespace-pre-wrap text→RichTextDisplay |
| 14e — Email templates E10/E11/E12 | ✅ | Optional contenuto/descrizione param; private htmlSection() sanitizer (strips script + event handlers); inserted after highlight block |
| 14f — API routes (4) | ✅ | communications: contenuto to email; events: descrizione to email; opportunities: descrizione to email; discounts: add email dispatch + descrizione |
| 14g — NotificationBell alerts | ✅ | prevUnreadRef tracks unread count; on increase: playNotificationSound() (Web Audio, 880→1174Hz, 0.5s) + setBellPulse(true) |
| 14h — globals.css animation | ✅ | @keyframes bell-pulse (scale+rotate, 0.6s ease-out) + .bell-pulse class; onAnimationEnd resets state |
| 14i — Playwright e2e | ✅ | 3/3 passed: S1 H2 heading stored+rendered, S2 editor loads existing HTML, S3 collaboratore RichTextDisplay |

---

## Legend

| Symbol | Meaning |
|---|---|
| ✅ | Complete: build ✅, unit tests ✅, Playwright ⏸ suspended (temporary instruction), checklist signed off, CLAUDE.md updated |
| 🔄 | In progress (active block) |
| 🔲 | Not started |
| ⏸ | Suspended / blocked by dependency |
