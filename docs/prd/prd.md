# Staff Manager
Product Requirements Document

Status: Living Document — reviewed and updated after each development block
Version: 1.0  |  Date: 2026-03-15  |  Audience: Stakeholders & Development Team

### Table of Contents
Tip: for clickable navigation → Docs: Insert → Table of contents → With blue links

Part I — Product Overview
  1.  Vision & Purpose
  2.  Goals
  3.  Out of Scope
  4.  Glossary
Part II — Users & Roles
  5.  Role Definitions
  6.  Member Status
  7.  Navigation & Access by Role
Part III — Core Features & Functional Requirements
  8.  Collaborator Profile Management
  9.  Compensation Management
  10. Reimbursement Management
  11. Document Management & Electronic Signing
  12. Support Tickets
  13. Content Publishing
Part IV — Cross-Cutting Features
  14. User Management & Onboarding
  15. Import Operations
  16. Export & Reporting
  17. Notifications & Communications
  18. Settings & Configuration
Part V — Open Questions
Part VI — Decision Log
Part VII — Changelog
Appendix A — Technical Overview (Development Team)

## Part I — Product Overview
### 1. Vision & Purpose
Staff Manager is the internal operations portal for managing collaborators across the Testbusters and Peer4Med communities. It consolidates what were previously fragmented processes — compensation tracking, reimbursement approvals, document signing, support tickets, and content publishing — into a single, role-aware digital workspace.

The portal serves three distinct user types: collaboratori who need direct visibility into their own records without intermediary requests; community managers (responsabili) who operate within the scope of their assigned community; and administrators who hold full operational authority across both communities.

Every interaction in Staff Manager is authenticated, role-scoped, and traceable. The system is not a public-facing product — it is a precision tool for internal operations.

### 2. Goals
Staff Manager is designed to achieve the following operational objectives:

Eliminate manual compensation management. Replace spreadsheet-based compensation tracking with a structured workflow that enforces approval steps, validates earning limits, and generates documentation automatically.

Provide a single source of truth for each collaborator. Every record — compensation history, reimbursement claims, signed documents — is associated with a specific collaborator and accessible in one place, with role-appropriate visibility.

Enable scoped autonomy for community managers. Responsabili can operate within their assigned community without requiring full administrative access, reducing bottlenecks while preserving financial authority in the hands of the amministrazione.

Give collaboratori direct access to their own data. Collaboratori can view, submit, and track their own requests without depending on intermediary communications.

Support high-volume operational imports. The portal integrates with external spreadsheets and document storage to handle batch onboarding, compensation ingestion, and document archiving efficiently.

### 3. Out of Scope
The following are explicitly outside the scope of Staff Manager and will not be addressed by this system:

Self-service access. The portal is invite-only. There is no public registration, self-service password reset, or unauthenticated access of any kind.

Payment execution. Staff Manager records, approves, and documents compensation decisions but does not execute bank transfers or integrate with payroll systems. Payment disbursement remains a separate, external process.

Multi-organisation architecture. The system is purpose-built for Testbusters and Peer4Med. It does not support tenancy, white-labelling, or configuration for other organisations.

Mobile-native experience. The administrative and management experience is optimised for desktop. Collaborator-facing views are responsive but not designed as a mobile-first application.

Real-time collaboration. Support tickets are asynchronous. There is no live chat, presence indicator, or real-time notification push system.

### 4. Glossary
The following terms are used throughout this document with specific meanings:

#### Collaboratore
A community member registered in the portal as an end user. Collaboratori interact with the system to consult their own compensation history, submit reimbursements, sign documents, and open support tickets. They have no visibility into other collaborators' records.

#### Responsabile Compensi
A community manager assigned to one or more communities. Responsabili can create compensation entries for their community members and manage their profiles, but do not hold approval or payment authority. That authority is reserved exclusively for the Amministrazione.

#### Amministrazione
The administrative role with unrestricted access to all portal functionality. The Amministrazione is the only role authorised to approve, reject, and liquidate financial records, manage users, and access operational settings.

#### Community
An organisational unit within the portal — currently Testbusters or Peer4Med. Each collaborator belongs to exactly one community. Responsabili are assigned to one or more communities and can only manage collaborators within their assigned scope.

#### Compensation
A payment record representing remuneration owed to a collaboratore for work performed within a defined competency area (e.g., training, material production). Compensations are created by management and go through a structured approval workflow before reaching the payment stage.

#### Reimbursement
An expense claim submitted by a collaboratore for out-of-pocket costs incurred on behalf of the community. Reimbursements follow the same approval and payment workflow as compensations.

#### Document
A formal file associated with a collaboratore. The portal handles three document types: employment contracts (CONTRATTO), income tax certificates issued annually (CU), and payment receipts generated upon liquidation (RICEVUTA). Contracts require electronic signing by the collaboratore.

#### Ticket
A support request opened by any active portal user. Tickets are threaded conversations between the submitter and the management team, used to resolve operational questions or flag issues.

#### Content
Editorial material published by the Amministrazione to inform and engage collaboratori. Content types include announcements (Comunicazioni), events (Eventi), resources (Risorse), opportunities (Opportunità), and discounts (Sconti). Content can be targeted to specific communities or broadcast to all collaboratori.

#### Massimale
The annual gross earnings limit configured for each collaboratore. The system checks this limit at the moment of compensation approval and blocks the action if approval would cause the collaboratore to exceed their individual cap for the current year.

#### Member Status
The current operational state of a collaboratore's relationship with the organisation. Status determines the scope of access the collaboratore retains in the portal. See Section 6 for full definitions.

#### Workflow / State Machine
The defined set of allowed status transitions for a given entity (compensation, reimbursement, document, ticket). Each transition is controlled by role: only certain roles may move a record from one state to another.

## Part II — Users & Roles
### 5. Role Definitions
Staff Manager defines five roles. Three are currently active; two are reserved for future definition.

#### Collaboratore (active)
The collaboratore is the end user of the portal — the person about whom records are kept. Their experience is personal and bounded: they see only their own compensations, reimbursements, documents, and tickets. They can self-manage a defined subset of their profile information and submit reimbursement requests independently. They have no visibility into other collaborators' data and no authority over any approval workflow.

#### Responsabile Compensi (active)
The responsabile compensi is a community manager with operational responsibility for one or more assigned communities. Within that scope, they can create compensation records on behalf of collaboratori, view and manage collaborator profiles (with the exception of sensitive payment fields), and monitor the status of reimbursements, documents, and tickets for their community members. They can reply to and resolve tickets within their scope.

An important constraint governs this role: the responsabile compensi has no approval or payment authority. They may not approve, reject, or liquidate any compensation or reimbursement record. This boundary is a permanent product rule and reflects the principle that financial decisions remain centralised in the Amministrazione.

#### Amministrazione (active)
The Amministrazione holds unrestricted access to the portal. Beyond the capabilities of the responsabile compensi, administrators can approve, reject, and liquidate all financial records; generate and manage documents; invite new users and manage their lifecycle; configure the portal's operational settings; access monitoring and diagnostic tools; and run all import and export operations.

#### Responsabile Cittadino (under definition)
This role is reserved for a future community manager type whose operational scope is currently under product definition. It is not yet implemented in the portal and does not appear in the navigation or permission model.

#### Responsabile Servizi Individuali (under definition)
Same status as Responsabile Cittadino. Scope to be defined in a future product iteration.

### 6. Member Status
In addition to their role, each collaboratore carries a member status that reflects their relationship with the organisation. Status is managed exclusively by the Amministrazione and affects the collaboratore's access level within the portal.

#### Active (attivo)
The default state for a fully active collaboratore. All features available to the collaboratore role are accessible.

#### Leaving with Compensation (uscente_con_compenso)
The collaboratore has initiated an exit process but has open compensation or reimbursement records still in progress. They retain access to all their records and may continue to interact with in-progress items, but may not initiate new document upload requests.

#### Leaving without Compensation (uscente_senza_compenso)
The exit process is complete. The collaboratore retains read-only access to their documents section only — allowing them to retrieve tax certificates and receipts — but cannot interact with any other part of the portal.

### 7. Navigation & Access by Role
The portal presents a different navigation structure to each role, showing only the sections relevant to their responsibilities:

Collaboratore: Dashboard · Profile · Compensations · Reimbursements · Documents · Tickets · Content
Responsabile Compensi: Profile · Compensations & Reimbursements · Collaborators · Documents · Tickets · Content
Amministrazione: Work Queue · Collaborators · Export · Documents · Tickets · Content · Settings · Import

## Part III — Core Features & Functional Requirements
### 8. Collaborator Profile Management
Every collaborator in the system has a structured profile containing personal, fiscal, and operational information. The profile serves as the authoritative record of the collaborator's identity, payment details, and community membership. It is the data foundation upon which compensations, documents, and contracts are built.

Profiles are created by the Amministrazione at the time of invitation and completed by the collaboratore during the onboarding process. After onboarding, different roles retain different levels of edit access to the profile, reflecting the principle that collaboratori own their personal data while administrative decisions (contract type, start date) remain under administrative control.

FR-PROF-01: The system shall create a collaborator profile record upon administrator invitation, pre-populated with the email address and initial access credentials.
FR-PROF-02: The system shall require collaboratori to complete their profile — providing personal, fiscal, and community information — during the onboarding wizard before accessing any other portal section.
FR-PROF-03: After onboarding, the system shall allow collaboratori to self-edit the following fields at any time: email address, IBAN, payment account holder name, phone number, address, T-shirt size, VAT number, fiscal dependency status, and profile photo.
FR-PROF-04: The system shall restrict access to the IBAN and payment account holder name fields to the collaboratore (own record only) and the Amministrazione. The Responsabile Compensi may not read or modify these fields.
FR-PROF-05: The system shall enforce a unique, immutable username per collaborator. The username serves as the lookup key in all bulk compensation import operations.
FR-PROF-06: The system shall associate each collaborator with exactly one community. Community assignment is managed exclusively by the Amministrazione.
FR-PROF-07: The system shall allow the Responsabile Compensi to view and edit the profile fields of collaborators belonging to their assigned community, with the exception of IBAN, payment account holder name, contract start date, contract type, città, and materie insegnate.
FR-PROF-08: The system shall allow the Amministrazione to manage all profile fields for any collaborator, including fiscal details, payment information, contract start date, contract type, città, and materie insegnate.
FR-PROF-09: The profile shall capture the collaboratore's city of teaching activity (città) and the subjects they teach (materie insegnate). Both fields are mandatory at onboarding and during self-edit. Valid values are managed by the Amministrazione via a community-specific lookup table (lookup_options) and vary between Testbusters and Peer4Med communities. The Responsabile Compensi may read but not modify these fields.

### 9. Compensation Management
The compensation module manages the complete lifecycle of payment records from initial creation through to final liquidation. A compensation represents a payment due to a collaboratore for work performed within a defined competency area — such as training delivery, content production, or other contractually defined activities.

Compensations are always created by management (either the Responsabile Compensi or the Amministrazione) and enter the workflow immediately as pending records. The approval and payment stages are controlled exclusively by the Amministrazione, who also has the authority to perform these actions in bulk via the Work Queue. The system enforces an annual gross earnings ceiling for each collaboratore, checked automatically at the moment of approval.

FR-COMP-01: The system shall allow the Amministrazione and the Responsabile Compensi to create compensation records on behalf of any collaboratore within their management scope.
FR-COMP-02: Every newly created compensation record shall enter the workflow in the Pending (IN_ATTESA) status. No draft state exists — creation is equivalent to submission.
FR-COMP-03: The system shall restrict the authority to approve, reject, and liquidate compensation records exclusively to the Amministrazione role.
FR-COMP-04: At the moment of approval, the system shall verify that the collaboratore's year-to-date gross earnings do not exceed their individual annual limit (massimale). If approval would cause the limit to be exceeded, the action shall be blocked until the administrator explicitly authorises an exception.
FR-COMP-05: The system shall require the Amministrazione to provide a written rejection reason when rejecting a compensation record. This reason shall be visible to the collaboratore.
FR-COMP-06: The system shall allow a collaboratore to reopen a rejected compensation record, returning it to Pending status for re-review.
FR-COMP-07: Upon liquidation, the system shall automatically generate and archive a payment receipt document in the collaboratore's document history.
FR-COMP-08: The system shall allow the Amministrazione to approve or liquidate multiple pending compensation records simultaneously through a bulk action in the Work Queue. The annual earnings limit check applies individually to each record during bulk approval.
FR-COMP-09: The system shall support import of compensation records from an external spreadsheet, providing a validation preview before any records are committed to the database.
FR-COMP-10: The system shall apply a community-specific withholding tax rate when calculating compensation net amounts. Testbusters collaborators are subject to a 20% withholding on gross earnings (ritenuta = gross × 0.20). Peer4Med collaborators are subject to a reduced taxable base with a 20% rate applied to 60% of gross earnings (ritenuta = gross × 0.60 × 0.20). This rate must be applied consistently at creation, import, receipt preview, receipt generation, and document recompilation.
FR-COMP-12: The system shall allow a collaboratore to request liquidation of their APPROVATO compensation and reimbursement records when the total net amount of the selected records is at least €250. The request must reference specific individual records (no partial-record splits). Only one active (in_attesa) liquidation request is allowed per collaboratore at any time. The request captures: selected compensation_ids, expense_ids, total net, IBAN (snapshot at request time), and optional P.IVA declaration. The collaboratore may revoke an in_attesa request. The Amministrazione receives the request in the Work Queue (/coda → Liquidazioni tab), can accept (which bulk-liquidates exactly those records) or reject (with optional note). Both outcomes trigger in-app and email notifications to the relevant party.

FR-COMP-11: The system shall allow the Responsabile Compensi to permanently delete compensation records that are in Pending (IN_ATTESA) status. Deletion is not permitted for records in any other status (APPROVATO, LIQUIDATO, RIFIUTATO). A confirmation dialog must be shown before the action is committed. The delete action is available on both the list view (/approvazioni) and the record detail page (/compensi/[id]).

### 10. Reimbursement Management
The reimbursement module allows collaboratori to submit expense claims for costs they have personally incurred on behalf of the community — travel expenses, material purchases, and similar out-of-pocket items. Unlike compensations, reimbursements are self-submitted by the collaboratore and are accompanied by supporting documentation uploaded at the time of submission.

The approval and payment workflow is identical to compensations, with the same role-based controls. The Responsabile Compensi retains read-only visibility into reimbursement records for their community members but does not hold approval authority.

FR-REIMB-01: The system shall allow collaboratori to create reimbursement requests for expenses they have incurred, including an expense date, description, amount, and supporting documentation attachments.
FR-REIMB-02: Every reimbursement request shall be created in the Pending (IN_ATTESA) status by the collaboratore.
FR-REIMB-03: The system shall allow the collaboratore to edit their reimbursement request — including updating attachments — for as long as the request remains in Pending status. Editing is not permitted once the record has been approved or rejected.
FR-REIMB-04: The system shall allow the Responsabile Compensi to view reimbursement requests submitted by collaboratori in their assigned community. The Responsabile Compensi may not approve, reject, or liquidate reimbursements.
FR-REIMB-08: The system shall allow the Responsabile Compensi to permanently delete reimbursement records that are in Pending (IN_ATTESA) status, following the same rules as FR-COMP-11. The delete action is available on both the list view (/approvazioni?tab=rimborsi) and the record detail page (/rimborsi/[id]).
FR-REIMB-05: The system shall restrict the authority to approve, reject, and liquidate reimbursement requests exclusively to the Amministrazione role.
FR-REIMB-06: The same rejection and reopen rules that apply to compensations shall apply to reimbursements: rejection requires a written reason; the collaboratore may reopen a rejected request, returning it to Pending status.
FR-REIMB-07: Upon liquidation, the system shall automatically generate and archive a payment receipt document for the reimbursement.

### 11. Document Management & Electronic Signing
The document module maintains a formal archive of official documents associated with each collaboratore. Three document types are managed by the portal: employment contracts (generated or uploaded at the time of onboarding), annual income tax certificates (CU, imported in bulk each year), and payment receipts (generated automatically when a compensation or reimbursement is liquidated).

Documents that require the collaboratore's acceptance — specifically contracts — enter the portal in an unsigned state and must be electronically signed before they are considered complete. The portal provides a guided signing experience that embeds the collaboratore's signature directly into the PDF file.

FR-DOC-01: The system shall maintain a structured document archive for each collaboratore, organised by document type: contract, income tax certificate, and payment receipt.
FR-DOC-02: The system shall enforce a maximum of one active contract per collaboratore. The document catalogue shall clearly distinguish the current active contract from any superseded versions.
FR-DOC-03: The system shall allow the Amministrazione to upload, replace, and delete documents for any collaboratore.
FR-DOC-04: The system shall allow the Responsabile Compensi to view — but not upload, replace, or delete — documents for collaborators in their assigned community.
FR-DOC-05: The system shall allow collaboratori to view and download their own documents at any time.
FR-DOC-06: When a document requires signing, the system shall present the collaboratore with a guided signing flow. Upon completion, the document shall transition to the Signed status, with the collaboratore's signature embedded in the file.
FR-DOC-07: The system shall allow the Amministrazione to generate contracts and payment receipts programmatically from pre-configured templates, automatically populating them with the collaboratore's profile data.
FR-DOC-08: The system shall support bulk import of CU documents from an external document management system, matching each document to the correct collaboratore by username and filing it automatically in their archive.
FR-DOC-09: The system shall generate and archive a payment receipt automatically whenever a compensation or reimbursement record is liquidated.

### 12. Support Tickets
The ticket module provides an asynchronous support channel between portal users and the management team. Tickets are used to raise operational questions, flag anomalies, or request clarification on any portal-managed record. Any active user may open a ticket, regardless of role.

Tickets are managed as threaded conversations, visible to the submitter and to the management team members responsible for their community. Each ticket carries a priority level and moves through a defined status progression as it is handled.

FR-TICK-01: The system shall allow any active portal user — regardless of role — to open a support ticket, providing a title, a description, and a priority level.
FR-TICK-02: The system shall restrict a collaboratore's visibility to their own tickets only. They may add replies to their own tickets but cannot view or interact with tickets submitted by others.
FR-TICK-03: The system shall allow the Responsabile Compensi to view, reply to, and change the status of tickets submitted by collaboratori in their assigned community.
FR-TICK-04: The system shall allow the Amministrazione to view, reply to, assign, and manage all tickets in the portal, regardless of community or submitter.
FR-TICK-05: Tickets shall progress through three statuses: Open (APERTO), In Progress (IN_LAVORAZIONE), and Closed (CHIUSO). Only the Amministrazione may reopen a ticket once it has been closed.
FR-TICK-06: The system shall notify the relevant parties when a ticket is opened and when a new reply is posted to an existing thread.

### 13. Content Publishing
The content module enables the Amministrazione to communicate with collaboratori through structured editorial content. Five content types are supported, each serving a distinct communication purpose: Comunicazioni for general announcements, Risorse for reference materials and guides, Eventi for events and scheduled activities, Opportunità for professional opportunities, and Sconti for discounts and benefits.

Content can be targeted to collaboratori within specific communities or broadcast to all portal users. Collaboratori and Responsabili can read published content but may not create, edit, or delete it.

FR-CONT-01: The system shall provide five distinct content categories: Comunicazioni (announcements), Risorse (resources), Eventi (events), Opportunità (opportunities), and Sconti (discounts).
FR-CONT-02: The system shall restrict content creation, editing, and deletion to the Amministrazione role.
FR-CONT-03: The system shall allow content to be targeted to one or more specific communities. When no community target is specified, content shall be visible to all collaboratori across all communities.
FR-CONT-04: The system shall allow collaboratori and Responsabili to view all content published to their community.
FR-CONT-05: The system shall support expiry dates on time-sensitive content types (events, opportunities, discounts). Expired content shall no longer be displayed to collaboratori.
FR-CONT-06: Upon publication, the system shall send an in-app notification and an email to all collaboratori targeted by the content.
FR-CONT-07: The system shall allow the Amministrazione to publish reference materials (resources) for fiscal and administrative guidance, which can be filtered by topic tag.
FR-CONT-08: The system shall support city-scoped events, identifiable by a `citta` field on the event record. National events (citta = null) are visible to all collaboratori; city-scoped events are visible only to collaboratori whose `citta` profile field matches the event's city. The Responsabile Cittadino can create, edit, and delete events scoped to their own city via a dedicated CRUD page (/corsi/eventi-citta). The city and community are auto-set from the Responsabile Cittadino's profile at creation time. Notifications for city-scoped events are sent only to collaboratori in the matching city.

### 13b. Course Management (Corsi)
Staff Manager includes a dedicated section for managing training courses (corsi) across both communities. Each corso aggregates a series of individual lessons (lezioni), with assignments of collaboratori as docenti, co-coordinators (cocoda), or Q&A operators. The Amministrazione manages courses, while collaboratori apply for teaching roles (in subsequent blocks).

FR-CORSI-01: The system shall allow the Amministrazione to create, edit, and delete corsi, including all scheduling and operational metadata (dates, modality, links, capacity limits, city). Deletion is guarded: if the corso has active candidature (stato != 'ritirata') or any assegnazioni, the API returns 409 and deletion is blocked. A CorsoDeleteButton component (AlertDialog confirm + 204/409 handling) is shown in the admin corso detail header.
FR-CORSI-02: The system shall compute the stato of each corso (programmato, attivo, concluso) from its data_inizio and data_fine — it is never stored as a column.
FR-CORSI-03: The system shall allow the Amministrazione to add, edit, and delete lezioni within a corso. The duration (ore) of each lezione shall be computed automatically from the scheduled start and end times.
FR-CORSI-04: The system shall display corsi in a filterable list (by community, stato, and free text search) accessible to the Amministrazione.
FR-CORSI-05: The system shall allow the Amministrazione to manage a blacklist of collaboratori who are barred from teaching assignments. Only one blacklist entry per collaboratore is permitted.
FR-CORSI-06: The system shall allow the Amministrazione to manage global attachment files (allegati globali) of two types — docenza and cocoda — one per community, available for download by all authenticated users.
FR-CORSI-07: The Responsabile Cittadino role shall have a dedicated navigation structure for the Corsi section: Candidatura e Assegnazione (/corsi/assegnazione), Valutazione Corsi (/corsi/valutazioni), and corso detail (/corsi/[id]). The /corsi route redirects to /corsi/assegnazione for this role.
FR-CORSI-11: The Responsabile Cittadino shall be able to submit a candidatura di città (citta_corso) for corsi without an assigned city. If their citta_responsabile is not configured, candidature submission is disabled and an alert is shown.
FR-CORSI-12: The Responsabile Cittadino shall be able to accept or reject docente/qa candidature for lezioni in corsi assigned to their city (citta = citta_responsabile). The Amministrazione can do the same for any corso.
FR-CORSI-13: The Responsabile Cittadino shall be able to assign a valutazione (numeric 1–10) per collaboratore×ruolo×materia on the /corsi/valutazioni page. Each lezione may carry one or more materie (stored as a non-empty TEXT[] array on the lezioni table). For docente: valutazione is scoped per materia (computed by iterating each lezione's materie array and bucketing assegnazioni by the collaborator + ruolo + materia triple); input is locked until the docente covers ≥80% of lezioni-with-that-materia. For cocoda: a single valutazione applies to all lezioni (no materia split), always unlocked. The UI groups entries by ruolo section (CoCoDa first, then Docente grouped by materia). An E18 email and Telegram notification are sent fire-and-forget when a valutazione is saved.
FR-CORSI-08: Collaboratori shall be able to view corsi available in their own community (stato: programmato or attivo) and submit candidature for individual lezioni as Docente or Q&A. Candidature in stato in_attesa may be withdrawn by the collaboratore at any time.
FR-CORSI-09: Collaboratori on the blacklist shall be able to view the Corsi section but all candidatura submission actions shall be disabled, with a visible notice explaining the restriction.
FR-CORSI-10: When a collaboratore has been assigned to a lezione (via assegnazioni), this shall be displayed as a badge in the lezioni view. Assigned collaboratori cannot submit new candidature for the same lezione.
FR-CORSI-14: The Responsabile Cittadino shall be able to assign a CoCoD'à (co-coordinator) to individual lezioni in corsi assigned to their city, by selecting a collaboratore from a dropdown within the /corsi/assegnazione page. The assignment is stored as an assegnazione with ruolo='cocoda' and is visible as read-only once confirmed.
FR-CORSI-16: The collaboratore dashboard Q&A KPI boxes shall display both the count of upcoming/past Q&A assignments and the total hours (ore) for those assignments. Hours are computed by summing lezione.ore (a generated column derived from orario_inizio and orario_fine) for the filtered assignment set. If ore = 0, only the contextual label ("programmato / attivo" or "con valutazione") is shown.
FR-CORSI-15: The collaboratore /corsi page shall present three clearly separated sections: (1) "I miei corsi" — corsi in which the collaboratore has at least one assegnazione; (2) "Docenza" — all community corsi available for docente candidature (in_aula filtered by city match if citta is set); (3) "Q&A" — all community corsi available for Q&A candidature. A monthly calendar widget (CorsiCalendario) shall be shown above the sections when the collaboratore has at least one assegnazione, displaying each lezione with colour coding by role (docente/cocoda/qa) and supporting month navigation.

FR-CORSI-17: The Responsabile Cittadino shall be able to revoke an accepted candidatura (docente or Q&A) by setting its stato back to 'in_attesa', using a "Revoca" button visible on accettata rows in /corsi/[id]. The revoke action is guarded by an AlertDialog and implemented via PATCH /api/candidature/[id] with stato='in_attesa' (only valid when current stato is 'accettata').

FR-CORSI-18: The Responsabile Cittadino shall be able to remove an existing CoCoD'à assegnazione from /corsi/assegnazione via a "Rimuovi" button with AlertDialog confirmation. The removal is implemented via DELETE /api/assegnazioni/[id] (ruolo check + city ownership check). After removal, the lezione row returns to the "select + Assegna" state.

FR-CORSI-19: The /corsi/[id] page shall display, for each candidatura row visible to resp.citt: (a) a red "Blacklist" badge if the collaboratore is in the blacklist table; (b) for Q&A candidature, inline metadata chips (materie_insegnate, città, Q&A svolti count). Capacity limits (max_docenti_per_lezione, max_qa_per_lezione) shall be shown as outline badges above the candidature table.

FR-CORSI-20: The /corsi/assegnazione page shall expose an "Export CSV" button per corso in the "I miei corsi" section. Clicking triggers a browser download of /api/assegnazioni/export?corso_id=UUID returning a CSV with columns: data, orario_inizio, orario_fine, materia, nome, cognome, ruolo. The export is scoped to the resp.citt's city.

FR-CORSI-21: The system shall send an E13 assignment notification email to a collaboratore when: (a) their docente or Q&A candidatura is accepted by resp.citt or admin; (b) they are assigned as CoCoD'à by resp.citt. The email uses emailAssegnazioneCorsi() and is sent fire-and-forget.

FR-CORSI-22: A Vercel cron job (GET /api/jobs/lesson-reminders, schedule 0 7 * * *) shall send E14 reminder emails to all collaboratori with assegnazioni on the next calendar day. Auth: Bearer CRON_SECRET. Emails are sent fire-and-forget per assegnazione.

FR-CORSI-23: The Responsabile Cittadino shall be able to assign a collaboratore as Docente to an individual lezione from the /corsi/[id] detail page, via a combobox filtered by city (citta_responsabile). The assignment is implemented via POST /api/assegnazioni with ruolo='docente'. City ownership and duplicate checks apply. An E13 email (with role label "Docente") is sent fire-and-forget.

FR-CORSI-24: The Responsabile Cittadino and Amministrazione shall have a read-only /lista-nera page listing all collaboratori currently in the blacklist table. Columns: nome, cognome, username, note, data inserimento. Sourced from GET /api/blacklist. The page is accessible from the sidebar navigation.

FR-CORSI-25: The Responsabile Cittadino shall be able to assign CoCoD'à roles at corso level (applying to all lezioni in the corso) via dedicated panels in /corsi/assegnazione. POST /api/assegnazioni/corso accepts { corso_id, collaborator_ids, ruolo: 'cocoda' }. Constraints: max 2 CoCoD'à per corso. Duplicate assegnazioni are skipped (idempotent). E13 email sent fire-and-forget per collaboratore. Q&A assignment is per-lezione (see FR-CORSI-32). Docente assignment is available both per-lezione (FR-CORSI-23) and at corso level (FR-CORSI-32).

FR-CORSI-32: The Responsabile Cittadino shall be able to assign Docenti at corso level and Q&A per lezione from /corsi/assegnazione. (a) "Docenti del corso" section — mirrors the CoCoD'à bulk section, using POST /api/assegnazioni/corso with ruolo='docente'; max capped at max_docenti_per_lezione (up to 4 slots shown). (b) "Q&A" toggle per corso expands a QAPanel showing per-lezione Q&A slots: each lezione displays existing QA assegnazioni with AlertDialog remove button, plus a dropdown + assign button for the next available slot (up to max_qa_per_lezione). Assignment uses POST /api/assegnazioni with ruolo='qa'; removal uses DELETE /api/assegnazioni/[id] (now accepts all ruolo values — cocoda, docente, qa). Optimistic state updates apply for both sections.

FR-CORSI-26: When the Responsabile Cittadino or Amministrazione accepts a candidatura via PATCH /api/candidature/[id], the system shall enforce per-lezione capacity limits: for tipo='qa_lezione', the count of accettata candidature for that lezione must be below max_qa_per_lezione; for tipo='docente_lezione', below max_docenti_per_lezione. If the limit is already met, the API returns 422 with a descriptive error message.

FR-CORSI-27: The Collaboratore view of /corsi shall display corsi in three sections: (1) "I miei corsi" — corsi with at least one assegnazione for the collaboratore; (2) "Corsi programmati — Docenza" — corsi whose citta matches the collaboratore's own citta (both online and in_aula), or an empty state if the collaboratore has no citta assigned; (3) "Q&A programmati" — all online corsi with max_qa_per_lezione >= 1, community-scoped, without city filtering. The monthly CorsiCalendario widget (showing ruolo, time range, and ore) is displayed above section 1 when the collaboratore has active assegnazioni.

FR-CORSI-28: When a new corso is created via POST /api/corsi with a non-null citta, the system shall send email E17 (emailNuovoCorsoInCitta) fire-and-forget to all active collaboratori whose citta matches the corso's citta within the same community. The email includes corso name, city, start and end dates, and a CTA link to /corsi.

FR-CORSI-29: The Responsabile Cittadino shall be able to assign Docente and Q&A roles directly from /corsi/[id] and at corso level from /corsi/assegnazione. POST /api/assegnazioni accepts ruolo='docente' with max_docenti_per_lezione validation. POST /api/assegnazioni/corso accepts ruolo='docente' for bulk assignment. RLS policies assegnazioni_docente_insert and assegnazioni_qa_insert enforce city ownership. The DELETE policy (assegnazioni_resp_citt_delete) covers all ruoli (not just cocoda).

FR-CORSI-30: Collaborator dropdowns in /corsi/assegnazione and /corsi/[id] shall display username alongside nome/cognome in the format "cognome nome (username)" for disambiguation.

FR-CORSI-31: A lezione may cover one or more materie (stored as a non-empty TEXT[] array). The Amministrazione selects one or more materie when creating/editing a lezione; the UI renders them as a chip group. Candidature for ruolo='docente_lezione' are accepted only if the collaboratore's materie_insegnate overlap with at least one entry in the lezione's materie; the API returns 422 with a descriptive error otherwise. Q&A candidature and CoCoD'à assignments are not filtered by materia.

## Part IV — Cross-Cutting Features
### 14. User Management & Onboarding
Staff Manager operates on a strictly invite-only model. New accounts may only be created by the Amministrazione; there is no self-service registration path. The onboarding flow is designed to ensure that every collaboratore provides complete and verified profile information before gaining access to the full portal.

FR-USER-01: The system shall allow the Amministrazione to create new collaboratore accounts through an invitation form. The form requires: community assignment (which determines tipo_contratto automatically — OCCASIONALE for Testbusters, OCCASIONALE_P4M for Peer4Med), città assignment, contract end date, and basic anagrafica (name, username, start date in quick mode; full profile in complete mode). Generating initial login credentials and sending them to the new user's email address. Credentials are also displayed in the portal as a backup, in case of email delivery failure.
FR-USER-01b: The invitation form shall include a "Salta firma contratto" toggle. When enabled, the onboarding wizard will not generate or request contract signature; the administrator may upload the signed document later from the Documents section.
FR-USER-02: Upon first login, the system shall detect that the user has not yet set a personal password and require them to choose one before proceeding to any other section of the portal.
FR-USER-03: After setting a password, the system shall detect that the user's profile is incomplete and redirect them to the onboarding wizard — a multi-step flow that collects all mandatory profile data and (optionally) contract generation. Città is set at invite time by the administrator and is not collected during onboarding.
FR-USER-04: The system shall allow the Amministrazione to deactivate user accounts and transition collaboratori through member status changes (active, leaving with compensation, leaving without compensation).
FR-USER-05: The system shall allow the Amministrazione to reset any user's password and communicate new credentials.
FR-USER-06: The system shall track whether the invitation email was successfully delivered for each collaboratore (invite_email_sent flag on user_profiles). The collaboratori list and detail pages display two status badges: "Mail invito" (Inviata/Non inviata) reflecting email delivery, and "Attivazione profilo" (Completato/In attesa) reflecting onboarding completion.
FR-USER-07: The system shall allow the Amministrazione to re-send an invitation email to any collaboratore who has not yet changed their initial password (must_change_password = true). Re-sending generates a new temporary password, sends the standard invitation email template (E8), and displays the credentials in the portal as a backup. The re-send action is available from the collaboratore detail page.
FR-USER-08: Upon user creation (both single invite and bulk import), the system shall propagate the must_change_password flag to auth.users.raw_app_meta_data for consistency between the application layer (user_profiles) and the auth layer. The flag is cleared from both layers when the user changes their password.

### 15. Import Operations
To support operational efficiency, Staff Manager integrates with external data sources for bulk data ingestion. All import operations follow a consistent pattern: a preview step that validates the source data and surfaces any errors, followed by a confirmation step that commits the validated records to the database. The result of each operation is written back to the source spreadsheet.

FR-IMP-01: The system shall support bulk import of collaborator records from a designated Google Sheet, capturing profile information, community assignment, start date, and initial credentials. Upon run, the system shall send invitation emails to each successfully imported collaborator.
FR-IMP-02: The system shall support bulk import of compensation records from a Google Sheet, matching each row to an existing collaboratore by username and creating the compensation record in Pending status.
FR-IMP-03: The system shall support bulk import of signed contract files from a designated Google Drive folder, associating each file with the correct collaboratore by matching filename conventions and archiving it as a signed contract document.
FR-IMP-04: The system shall support bulk import of CU (income tax certificate) documents from a Google Drive folder, associating each file with the correct collaboratore and notifying them upon successful import.
FR-IMP-05: All import operations shall provide a preview step that validates the source data, displays a row-by-row status report including any validation errors, and requires explicit administrator confirmation before any records are written to the database.
FR-IMP-06: After each import run, the system shall write the result status of each row — success or error with a descriptive reason — back to the source Google Sheet.
FR-IMP-07: The system shall support bulk import of corsi and their lezioni from a designated Google Sheet with one tab per corso (tab name maps to corso identifier; columns A-E carry lezione data including multi-materia badges; columns G-H carry corso-level metadata). Idempotency is enforced via a TO_PROCESS/PROCESSED marker cell written back to the sheet after each successful tab and via a UNIQUE constraint on corsi.codice_identificativo. Materie values are normalised to Title Case against the lookup_options catalog; unknown materie, unknown communities, malformed dates, or out-of-enum modalità produce per-tab ERROR entries without aborting the rest of the run. Partial failures within a tab (corso inserted, lezioni failed) trigger a best-effort rollback (CASCADE delete of the corso). The import is admin-only via POST /api/admin/import-corsi/run, accepts an optional notify toggle (default off) that suppresses the E17 "nuovo corso in città" email when false, and is exposed as a dedicated Corsi tab inside the /import page alongside Collaboratori, Contratti, and CU.

### 16. Export & Reporting
The export module allows the Amministrazione to extract compensation data from the portal for external processing and record-keeping. Exports are directed to a designated Google Sheet and can be filtered before execution.

FR-EXP-01: The system shall allow the Amministrazione to export compensation data to a designated Google Sheet, with records grouped by collaboratore.
FR-EXP-02: The system shall maintain a history of past export operations, accessible by the Amministrazione, recording the date, scope, and outcome of each export run.
FR-EXP-03: The system shall allow the Amministrazione to download filtered compensation data as a CSV file.

### 17. Notifications & Communications
Staff Manager uses a dual notification model: in-app notifications surface relevant events in real time within the portal, while transactional emails ensure that important updates reach users even when they are not logged in. Both channels are configurable by the Amministrazione.

FR-NOTIF-01: The system shall send automated email notifications to the relevant parties upon the following events: new user invitation, compensation status changes (approval, rejection, liquidation), new ticket submission, ticket replies, and content publication.
FR-NOTIF-02: The system shall maintain an in-app notification centre, accessible from all portal pages, displaying unread notifications for the current user with a visual unread count indicator.
FR-NOTIF-03: The system shall allow the Amministrazione to configure which notification types are delivered to each recipient role, enabling or disabling specific event-role combinations.
FR-NOTIF-04: Notification delivery failures — whether in-app or email — shall not interrupt or reverse the primary action that triggered the notification.
FR-NOTIF-05: The system shall provide an opt-in Telegram notification channel for collaboratori. A collaboratore may connect their Telegram account via a deep-link flow from the Impostazioni tab of their profile page. Connection is initiated by the portal (POST /api/telegram/connect returns a deep link); the Telegram bot receives the /start TOKEN command via webhook (POST /api/telegram/webhook) and stores the resulting chat_id on the collaborators record. Once connected, the collaboratore receives Telegram messages alongside emails for the following events: (a) docente/CoCoD'à/Q&A assignment; (b) new corso published in their city; (c) 24h lesson reminder. The Amministrazione can reset any collaboratore's Telegram connection via the admin collaboratore detail page. Message delivery is fire-and-forget; failures do not block the triggering action. The channel is disabled if TELEGRAM_BOT_TOKEN is not configured.
FR-NOTIF-06: Community field assignment is exclusive to the Amministrazione. Collaboratori cannot self-assign or change their community via the profile self-edit flow. The community field on /profilo is displayed as read-only text for collaboratori.

### 18. Settings & Configuration
The settings module gives the Amministrazione control over the operational configuration of the portal, including the content of all transactional communications, the list of competency types available for compensation records, document generation templates, and access management for community managers.

FR-SET-01: The system shall allow the Amministrazione to customise the content and visual layout of all transactional email templates used by the portal, with changes taking effect for all subsequent sends.
FR-SET-02: The system shall allow the Amministrazione to manage the list of available compensation competency types — the categories that define what type of work a compensation represents.
FR-SET-03: The system shall allow the Amministrazione to upload and manage the document templates used for contract and receipt generation. Four template slots are available — one contract and one receipt per community (Testbusters and Peer4Med) — each independently uploadable and replaceable. Template selection at generation time is determined by the collaboratore's community membership.
FR-SET-04: The system shall provide an operational monitoring dashboard for the Amministrazione, displaying system health indicators, user access logs, email delivery reports, database performance metrics, and application error records.
FR-SET-05: The system shall allow the Amministrazione to assign community management access to Responsabili, defining which communities each Responsabile is authorised to manage.
FR-SET-06: The system shall allow the Amministrazione to configure a community-specific informational banner, visible to collaboratori as the first element of the app layout (above the notification header). Each community has an independent banner with rich-text content, an optional CTA link (with configurable label and new-tab behaviour), and an active/inactive toggle. Collaboratori can dismiss the banner; the dismissed state persists in localStorage and is automatically reset when the banner content is updated by an administrator.

## Part V — Open Questions
The following items require product decisions before they can be incorporated into the requirements:

OQ-01: Responsabile Cittadino — What is the operational scope of this role? Which entities and workflows does it access? Does it share the same navigation pattern as the Responsabile Compensi, or does it require a distinct set of capabilities?

OQ-02: Responsabile Servizi Individuali — Same question as OQ-01. Both roles are currently reserved in the system but not yet implemented.

OQ-03: Automated PRD Sync — The development pipeline requires this document to be updated when features change. Should the sync be triggered automatically on each production deployment, or managed manually by the development team? An n8n workflow or a dedicated synchronisation tool are the candidate approaches.

## Part VI — Decision Log
This section records significant product decisions, the rationale behind them, and their impact on the system's behaviour. It serves as the institutional memory for choices that are not immediately obvious from the feature descriptions alone.

#### Responsabile Compensi cannot approve or liquidate (2026-03-05)
Decision: The Responsabile Compensi role is permanently restricted from approving, rejecting, or liquidating any compensation or reimbursement. This is not a temporary limitation — it is a deliberate product boundary.
Rationale: Financial approval decisions carry legal and fiscal implications. Centralising this authority in the Amministrazione ensures accountability and prevents errors that could arise from distributed approval authority across community managers.
Impact: Any block of development that touches the compensation or reimbursement workflow must respect this boundary without exception. It is not subject to future revision without an explicit product decision at the stakeholder level.

#### Single community per collaborator (2026-03-10)
Decision: Each collaborator belongs to exactly one community. The system enforces this at the database level.
Rationale: Multi-community membership created ambiguity in compensation attribution, document targeting, and community manager scope. A single, unambiguous community assignment simplifies operations across all modules.
Impact: The onboarding flow and the import process both require exactly one community to be specified per collaborator. Existing collaborators with multiple community assignments were migrated to a single assignment.

#### Compensation records have no community ownership (2026-03-10)
Decision: Compensation records are not associated with a community. The system identifies the managing Responsabile through the collaborator's community membership, not through a community field on the compensation record itself.
Rationale: Import operations (bulk compensation ingestion from Google Sheets) do not provide community context at the record level. Using the collaborator's community membership as the linking mechanism is more robust and avoids data duplication.
Impact: Filtering and access control for compensations always resolve through the collaborator, not the compensation record directly.

#### Removal of super_admin role (2026-02-27)
Decision: A previously defined super_admin role was removed from the system.
Rationale: The Amministrazione role already provides unrestricted access. A second administrative tier created confusion without adding operational value.
Impact: All capabilities previously associated with super_admin are now covered by the Amministrazione role.

#### PRD moved to Google Docs (2026-03-15)
Decision: The product requirements document is maintained as a live Google Doc rather than a static markdown file in the repository.
Rationale: Stakeholders and team members need a navigable, readable document that can be shared and consulted without requiring access to the code repository. The development pipeline maintains the source-of-truth markdown files; this document is the presentation layer.
Impact: The development pipeline includes a synchronisation step in Phase 8 that updates this document when significant product changes are made.

## Part VII — Changelog
2026-04-16  |  v2.14  |  Block g7-tests: Test coverage — RLS isolation tests for compensation_history + expense_history (6 tests verify cross-collaborator leakage blocked), mark-paid DB integration tests (4 tests cover APPROVATO→LIQUIDATO + history inserts + only-APPROVATO filter), email failure path unit tests (3 tests verify sendEmail never propagates Resend errors). TC1 and TC-NEW-1 closed as already resolved. Test count: 478→491. No migration, no feature/RBAC/UI change — purely test coverage.
2026-04-16  |  v2.13  |  Block g6-performance: Performance — parallelized admin dashboard queries (adminCollab into 25-query Promise.all), parallelized collab dashboard community fetch (into 10-query Promise.all), added width/height to 4 raw img tags (CLS fix on dashboard hero sections), parallelized YTD update loop in both bulk-approve routes, batch notification insert in liquidazione-requests. No feature, RBAC, or UI changes — purely internal performance. No migration.
2026-04-16  |  v2.12  |  Block g5-dry-quality: DRY / code quality — centralized duplicated constants (TSHIRT_SIZES with TshirtSize type, NOTIFICATION_TYPE_BADGE with dark-mode-safe semantic classes), added server-only guard on email-template-service.ts with client-safe preview functions extracted to email-preview-utils.ts, fixed missing XXXL in OnboardingWizard tshirt sizes, semantic badge colors for invite tracking, notification re-export facade, error logging on template rendering. No feature, RBAC, or UI changes — purely internal code quality. No migration.
2026-04-16  |  v2.11  |  Block g4-api-design: API design hardening — standardized Zod error shape (6 occurrences), added Zod validation to 13 content/ticket write routes (tickets, opportunities, communications, resources, events, discounts), enriched TransitionResult with reason_code for proper HTTP status mapping (403 role vs 409 state), change-password flagErr now logged and surfaced as warning, file size pre-validation on 6 upload routes (prevents memory spikes from oversized payloads, returns 413). No feature, RBAC, or UI changes — purely API contract hardening. No migration.
2026-04-16  |  v2.10  |  Block g3-security-hardening: API-level security hardening — Zod validation on change-password (min 8, max 128), error message sanitization across 16 routes (no internal details leaked to client), UUID path-param validation on all 40 dynamic API routes (rejects malformed IDs with 400), atomic Telegram token validation (prevents TOCTOU race on /start webhook). No feature, RBAC, or UI changes — purely defensive hardening. No migration.
2026-04-15  |  v2.9  |  Block refactor-g2a-financial-integrity: DB-level integrity constraints on compensations + expense_reimbursements (migration 070). NOT NULL on importo_lordo, importo_netto, ritenuta_acconto, data_competenza. CHECK importo_lordo > 0, ritenuta_acconto BETWEEN 0 AND 100, expense_reimbursements.importo > 0. Historical backfill of ritenuta_acconto via (lordo-netto)/lordo*100 with 20% fallback. Pure DB safety net — application layer (Zod) already enforces these rules; constraints protect against direct SQL access and future regressions. Zero functional change, zero application code change. Staging only per user directive; production deploy deferred.
2026-04-14  |  v2.8  |  Block bugfixing-corsi-compensi: updated FR-CORSI-01 (delete guard — 409 if corso has active candidature or assegnazioni; CorsoDeleteButton with AlertDialog confirm); updated FR-CORSI-25 (Q&A assignment moved from corso-level bulk to per-lezione QAPanel; docente corso-level section added); added FR-CORSI-32 (docenti corso-level bulk section + per-lezione QAPanel in /corsi/assegnazione — DELETE /api/assegnazioni/[id] now accepts all ruoli); counter fix: resp.compensi dashboard and /approvazioni now use server-side COUNT queries instead of in-memory filtering for IN_ATTESA KPIs (accurate beyond 1000 records).
2026-04-13  |  v2.7  |  Block corsi-gsheet-import: added FR-IMP-07 (admin GSheet bulk import for corsi + lezioni — one tab per corso, TO_PROCESS/PROCESSED writeback, idempotent via corsi.codice_identificativo UNIQUE, Title Case materie normalisation, per-tab ERROR reporting, best-effort rollback on lezione failure, optional E17 notification toggle); added FR-CORSI-31 (lezione multi-materia TEXT[] with CHECK array_length ≥ 1; docente_lezione candidature require materie overlap with collaboratore.materie_insegnate — 422 otherwise); updated FR-CORSI-13 (valutazioni per-materia computation iterates lezione.materie array). Migration 069: rename lezioni.materia TEXT → materie TEXT[] NOT NULL + lezioni_materie_nonempty CHECK + corsi_codice_identificativo_unique UNIQUE. Shared google-sheets helpers refactored into lib/google-sheets-shared.ts. New MateriaBadges component.
2026-04-12  |  v2.6  |  Block corsi-resp-citt-v2: updated FR-CORSI-13 (valutazioni restructured to per-ruolo×per-materia — docente scoped by materia with 80% coverage threshold, cocoda always unlocked; E18 email + Telegram notification on save); added FR-CORSI-29 (resp.citt can assign Docente/Q&A directly from /corsi/[id] and at corso level; RLS policies assegnazioni_docente_insert + assegnazioni_qa_insert; DELETE policy extended to all ruoli); added FR-CORSI-30 (username shown in collaborator dropdowns). Migration 068: 3 RLS policies + notification_settings row for valutazione_corso.
2026-04-11  |  v2.5  |  Block invite-tracking: added invite_email_sent tracking, re-send capability, UI status badges for delivery and activation; migration 067. POST /api/admin/collaboratori/[id]/resend-invite. must_change_password propagated to auth.users.raw_app_meta_data.
2026-04-05  |  v2.4  |  Block telegram-notifications: added FR-NOTIF-05 (opt-in Telegram channel for collaboratori — deep-link connection flow via /api/telegram/connect + /api/telegram/webhook; Telegram sends alongside email for assignment, new-city-corso, 24h reminder events; admin reset via /api/admin/collaboratori/[id]/telegram; fire-and-forget, no retries); added FR-NOTIF-06 (community field is admin-only — collaboratori see read-only display on /profilo). Migration 066: telegram_chat_id on collaborators, telegram_tokens table, notification_settings.telegram_enabled column seeded for 3 events.
2026-04-04  |  v2.3  |  Block v2-bugfixing-2: Fix FR-CORSI-27 (collab /corsi Docenza section now city-only filter for both online and in_aula; Q&A section correctly shows all online corsi without city filter; calendar pill now displays hours); added FR-CORSI-28 (POST /api/corsi sends E17 emailNuovoCorsoInCitta fire-and-forget to collaboratori in corso's city on creation). Email template E17 added to lib/email-templates.ts.
2026-04-04  |  v2.2  |  Block admin-invite-gaps: updated FR-USER-01 (invite form now requires community — determines tipo_contratto automatically, città assignment, contract end date; role field removed — only collaboratori are invited via UI); added FR-USER-01b (salta_firma toggle defers contract signature to post-invite); updated FR-USER-03 (città no longer collected during onboarding — set at invite time by admin). Fixes NOT NULL constraint on collaborators.citta introduced in migration 054.
2026-04-03  |  v2.1  |  Block v2-bugfixing-review: Bug #1 FeedbackButton loading fix (try/finally + fire-and-forget screenshot); Gap #2 direct Docente assignment per lezione from /corsi/[id] (FR-CORSI-23); Gap #3 /lista-nera read view for resp.citt + admin (FR-CORSI-24, GET /api/blacklist); Gap #4+#6 course-level CoCoD'à + Q&A bulk assignment via POST /api/assegnazioni/corso (FR-CORSI-25); Gap #5 per-lezione capacity limit enforcement in candidature acceptance, 422 on limit exceeded (FR-CORSI-26). Email E13 extended with dynamic role label ('Docente' vs "CoCoD'à" vs 'Q&A').
2026-03-27  |  v2.0  |  Block liquidazione-request: added FR-COMP-12 (collaboratore liquidation request flow — per-record checkbox selection, €250 net threshold, IBAN snapshot, P.IVA declaration, one active request per collaboratore at a time, admin accept/reject in /coda Liquidazioni tab, bulk-liquidation on accept, E15/E16 email notifications). New DB table: liquidazione_requests (migration 061). New components: LiquidazioneRequestBanner (4 states), CodaLiquidazioni. New API routes: POST/GET /api/liquidazione-requests, PATCH /api/liquidazione-requests/[id].
2026-03-24  |  v1.9  |  Block corsi-blocco4 (Gap fixes + CoCoD'à assignment): added FR-CORSI-14 (resp.citt CoCoD'à assignment per lezione from /corsi/assegnazione — POST /api/assegnazioni, RLS migration 058); added FR-CORSI-15 (3-section collab /corsi page with CorsiCalendario monthly calendar widget; in_aula docenza filtered by city). DashboardCorsiKpi expanded to 8 KPIs (added CoCoDà assegnati/svolti). Toast feedback on all candidatura actions.
2026-03-24  |  v1.8  |  Block corsi-dashboard (Dashboard + Profile Corsi Gaps): added materie_insegnate chips to collab dashboard hero and /profilo hero card; added DashboardCorsiKpi (6 KPI cards — assegnati/svolti docente, val.media docente+CoCoDà, assegnati/svolti Q&A); added "Prossimi eventi" box on collab dashboard (national events); added posti count display in LezioniTabCollab; added "Ultimi aggiornamenti" section to resp.citt dashboard (events/comms/opps/docs tabs — same DashboardUpdates component as collab). No new DB tables or migrations. Future blocks: eventi-citta, corsi-4.
2026-03-22  |  v1.7  |  Block corsi-3 (Responsabile Cittadino): updated FR-CORSI-07 (full resp.citt navigation and page access); added FR-CORSI-11 (candidatura città for corsi senza città), FR-CORSI-12 (candidature review — accept/reject docente/qa), FR-CORSI-13 (valutazione per collaboratore×corso). Migration 057: 4 RLS policies. Dashboard: resp.citt branch with city KPIs (no financial widgets). Collabs names sourced from collaborators.nome/cognome directly.
2026-03-22  |  v1.6  |  Block corsi-2 (Collaboratore View + Candidature): updated FR-CORSI-08 (collaboratore can view community corsi and submit/withdraw candidature); added FR-CORSI-09 (blacklist restricts candidature submission with visible notice) and FR-CORSI-10 (assegnazioni displayed as badge in lezioni view). Migration 056: RLS policies for collaboratore candidature INSERT + UPDATE (withdraw only).
2026-03-22  |  v1.5  |  Block corsi-1 (Foundation + Admin CRUD): added §13b Course Management (FR-CORSI-01 through FR-CORSI-08). New DB tables: corsi, lezioni, assegnazioni, candidature, blacklist, allegati_globali. Admin CRUD for corsi/lezioni; blacklist and allegati_corsi in /impostazioni. Responsabile Cittadino nav defined. Collab + resp.cittadino views deferred to corsi-2/corsi-3.
2026-03-22  |  v1.4  |  Delete IN_ATTESA: added FR-COMP-11 (responsabile_compensi can delete pending compensations with confirmation dialog, list + detail touchpoints) and FR-REIMB-08 (same capability for reimbursements).
2026-03-21  |  v1.3  |  Block Banner: added FR-SET-06 (community-specific dismissable banner for collaboratori — rich text, optional CTA link with new-tab option, localStorage-versioned dismiss, admin-managed per community in /impostazioni).
2026-03-18  |  v1.2  |  P4M Community Logic: added FR-COMP-10 (community-aware withholding tax — TB = 20%, P4M = 60% taxable base × 20%); updated FR-SET-03 (four document template slots, one contract + one receipt per community). Community-aware logic applied at all compensation and receipt touchpoints.
2026-03-15  |  v1.1  |  Full rewrite: narrative language, functional requirements (FR-*), glossary, out of scope, decision log. Structured for dual audience: stakeholders and development team.
2026-03-13  |  v1.0  |  Initial creation. Technical reference structure compiled from internal development context files.

## Appendix A — Technical Overview (Development Team)
This appendix is intended for the development team. It records technical decisions and constraints that are relevant to implementation but not to stakeholder understanding of the product.

### A.1 Technology Stack
Framework: Next.js 16 (App Router, TypeScript, standalone output)
Styling: Tailwind v4 + shadcn/ui component library — dark and light themes via next-themes
Authentication: Supabase Auth — email/password only. Session management via proxy.ts (not Next.js middleware).
Database: Supabase Postgres — row-level security enforced on every table
Storage: Supabase Storage — private buckets with signed URLs (1-hour TTL)
Email: Resend — 12 HTML templates stored in the database, configurable by the Amministrazione
PDF generation: pdf-lib + pdfjs-dist v5 (server-side fill), docxtemplater for Word-based contracts
Deployment: Replit — Node.js standalone server

### A.2 Environments
Production: staff.peerpetual.it — Supabase project nyajqcjqmgxctlqighql
Staging: staff-staging.peerpetual.it — Supabase project gjwkvgfwkdwzqlvudgqr (fully isolated)
Local development and all git worktrees always target the staging environment. Production credentials must never appear in any local configuration file.
The authorised credential source for local development is ~/.envs/staff-manager.staging.env.

### A.3 External Integrations
Google Sheets API: used for all import and export operations. Auth via service account (GOOGLE_SERVICE_ACCOUNT_JSON). Library: lib/google-sheets.ts.
Google Drive API: used for CU and contract PDF download during import operations. Same service account. Library: lib/google-drive.ts.
Resend: transactional email delivery. Webhook endpoint POST /api/webhooks/resend feeds the email delivery log in the Monitoraggio dashboard.
Supabase MCP: available in every development session for live database queries and migration execution.
Resend MCP: available in every development session for live email delivery verification during smoke tests.

### A.4 Key Development Rules
RBAC: full role-action-entity matrix in docs/prd/01-rbac-matrix.md. Consult before any block touching permissions.
Entity contracts: docs/contracts/ — one file per entity with field-level permission matrices. Mandatory Phase 1 lookup.
Dependency map: docs/dependency-map.md — code-level surface map. Mandatory Phase 1 lookup.
Pipeline: .claude/rules/pipeline.md — development workflow (Phases 0–8.5). Non-negotiable.
This PRD is updated in pipeline Phase 8, step 2f, when feature areas, architecture, integrations, or RBAC change.


