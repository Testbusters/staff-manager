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

## Part IV — Cross-Cutting Features
### 14. User Management & Onboarding
Staff Manager operates on a strictly invite-only model. New accounts may only be created by the Amministrazione; there is no self-service registration path. The onboarding flow is designed to ensure that every collaboratore provides complete and verified profile information before gaining access to the full portal.

FR-USER-01: The system shall allow the Amministrazione to create new user accounts through an invitation flow, generating initial login credentials and sending them to the new user's email address. Credentials are also displayed in the portal as a backup, in case of email delivery failure.
FR-USER-02: Upon first login, the system shall detect that the user has not yet set a personal password and require them to choose one before proceeding to any other section of the portal.
FR-USER-03: After setting a password, the system shall detect that the user's profile is incomplete and redirect them to the onboarding wizard — a multi-step flow that collects all mandatory profile data, community membership, and (optionally) contract generation.
FR-USER-04: The system shall allow the Amministrazione to deactivate user accounts and transition collaboratori through member status changes (active, leaving with compensation, leaving without compensation).
FR-USER-05: The system shall allow the Amministrazione to reset any user's password and communicate new credentials.

### 15. Import Operations
To support operational efficiency, Staff Manager integrates with external data sources for bulk data ingestion. All import operations follow a consistent pattern: a preview step that validates the source data and surfaces any errors, followed by a confirmation step that commits the validated records to the database. The result of each operation is written back to the source spreadsheet.

FR-IMP-01: The system shall support bulk import of collaborator records from a designated Google Sheet, capturing profile information, community assignment, start date, and initial credentials. Upon run, the system shall send invitation emails to each successfully imported collaborator.
FR-IMP-02: The system shall support bulk import of compensation records from a Google Sheet, matching each row to an existing collaboratore by username and creating the compensation record in Pending status.
FR-IMP-03: The system shall support bulk import of signed contract files from a designated Google Drive folder, associating each file with the correct collaboratore by matching filename conventions and archiving it as a signed contract document.
FR-IMP-04: The system shall support bulk import of CU (income tax certificate) documents from a Google Drive folder, associating each file with the correct collaboratore and notifying them upon successful import.
FR-IMP-05: All import operations shall provide a preview step that validates the source data, displays a row-by-row status report including any validation errors, and requires explicit administrator confirmation before any records are written to the database.
FR-IMP-06: After each import run, the system shall write the result status of each row — success or error with a descriptive reason — back to the source Google Sheet.

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


