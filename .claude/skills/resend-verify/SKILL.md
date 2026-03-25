---
name: resend-verify
description: Verify email delivery via Resend MCP after any action that triggers a send. Checks delivery status (sent/delivered/bounced/complained), sender address, CTA link domain, personalization token rendering, and domain SPF/DKIM/DMARC health. Supports single email and broadcast (multi-recipient) verification. Use after any Phase 5c step that triggers a transactional email.
user-invocable: true
model: sonnet
context: fork
argument-hint: [template:E<N>|action:<description>] [broadcast]
allowed-tools: mcp__resend__list-emails, mcp__resend__get-email, mcp__resend__list-domains, mcp__resend__verify-domain
---

Resend MCP is configured project-locally. Available in every session — use proactively whenever email delivery needs to be verified, even outside a formal Phase 5c.

## MCP tools available

| Tool | Purpose |
|---|---|
| `mcp__resend__list-emails` | List recent sends with `to`, `subject`, `status`, `created_at`, `id` |
| `mcp__resend__get-email` | Full detail of a single send: HTML body, plain text, all event data |
| `mcp__resend__list-domains` | List sending domains with status (verified / not_started / pending) |
| `mcp__resend__verify-domain` | Trigger async DNS re-check for a domain |

---

## Step 0 — Argument parsing

Parse `$ARGUMENTS`:

- `template:E<N>` — which template was triggered (E1–E14). Enables template-specific CTA pattern check (see template map in Step 3).
- `action:<description>` — free-text description of what triggered the email (e.g. `action:invite-collaboratore`, `action:approve-compensazione`).
- `broadcast` — flag indicating a content broadcast send (comunicazioni, eventi, opportunità, sconti, risorse). Enables multi-recipient check in Step 2.
- No arguments — generic single-email verification.

Announce: `Running resend-verify — [template: E<N> | action: <description> | generic] [broadcast: yes/no]`

---

## Step 1 — Domain health check

Run once (skip if you ran this check in the same session within the last hour).

```
mcp__resend__list-domains limit: 10
```

Find the domain `testbusters.it`. Check its `status` field:
- `verified` → PASS. SPF + DKIM records confirmed by Resend.
- `pending` → WARN. DNS verification in progress — may affect delivery.
- `not_started` → FAIL. Domain not verified — emails will likely land in spam or be rejected.

If status is not `verified`, call `mcp__resend__verify-domain` with the domain ID to trigger a re-check, then report the result.

Log: `Domain testbusters.it: [verified ✅ | pending ⚠️ | not_started ❌]`

---

## Step 2 — Email delivery verification

### 2a — Locate the email

Wait 8 seconds after the triggering action before calling list-emails (Resend processes sends asynchronously; 5s is insufficient for all providers).

```
mcp__resend__list-emails limit: 10
```

Find the relevant email by matching:
- `to` — the expected recipient address
- `subject` — the expected subject line (derived from the template map below if `template:E<N>` was provided)

If **broadcast** flag is set: find ALL emails from the same batch (same subject, sent within the same 60-second window). Note total count — compare against expected recipient count if known.

If no matching email found after 8s: wait another 10s and retry once. If still not found, report as NOT FOUND and stop.

### 2b — Delivery status check

For each email found, check its `status` field:

| Status | Meaning | Action |
|---|---|---|
| `sent` | Accepted by Resend, in transit | WARN — not yet confirmed delivered. Re-check in 30s. |
| `delivered` | Confirmed delivered to recipient's mail server | PASS |
| `bounced` | Delivery failed permanently (hard bounce) | FAIL — address invalid or domain rejected. Flag recipient address. |
| `complained` | Recipient marked as spam | FAIL — review email content and frequency. |
| `failed` | Send rejected before leaving Resend | FAIL — likely API error or rate limit. Check Resend dashboard. |

If status is `sent` after first check: wait 30s and call `mcp__resend__get-email` to re-check final status.

### 2c — Full content inspection

For the first matching email (or each if broadcast with ≤5 recipients), call:
```
mcp__resend__get-email id: <email_id>
```

Check all of the following:

**F1 — From address**
Expected: `noreply@testbusters.it`
Flag: any other sender address (e.g. `onboarding@resend.dev` = Resend sandbox, emails not delivered to external addresses).

**F2 — CTA link domain**
If the email contains a link (button, href):
- On staging: link must contain `staff-staging.peerpetual.it` — NOT `localhost` or `staff.peerpetual.it`
- On production: link must contain `staff.peerpetual.it`
Extract: all `href=` values from the HTML body. Flag any that don't match the expected domain.

**F3 — Personalization token rendering**
Check the rendered HTML for unresolved template tokens:
Grep the HTML body for: `{{`, `}}`, `<%`, `%>`, `[[`, `]]`
Flag: any literal template syntax appearing in the email body — indicates a template rendering failure (variable substitution did not occur).

**F4 — Template-specific checks** (only if `template:E<N>` argument provided)
See template map in Step 3. Apply the checks listed for the specified template.

---

## Step 3 — Template map

Reference for template-specific CTA and content verification. Use when `template:E<N>` is provided.

| Template | Trigger | Expected subject (partial) | CTA target | Key content to verify |
|---|---|---|---|---|
| E1 | Invite collaboratore | "Benvenuto" / "invito" | `/change-password` | Temp password visible in body |
| E2 | Compensazione approvata | "approvata" | `/compensi` | Amount + competenza present |
| E3 | Compensazione rifiutata | "rifiutata" | `/compensi` | Rejection note present |
| E4 | Compensazione liquidata | "liquidata" | `/compensi` | — |
| E5 | Rimborso approvato | "rimborso" + "approvato" | `/rimborsi` | Amount present |
| E6 | Rimborso rifiutato | "rimborso" + "rifiutato" | `/rimborsi` | Rejection note present |
| E7 | Documento da firmare | "documento" / "firmare" | `/documenti` | Document name present |
| E8 | Ticket reply | "ticket" / "risposta" | `/ticket/[id]` | Ticket ID in link |
| E9 | Contenuto pubblicato (comunicazione) | varies | `/contenuti/comunicazioni/[id]` | Title present |
| E10 | Contenuto pubblicato (evento) | varies | `/contenuti/eventi/[id]` | Event date present |
| E11 | Contenuto pubblicato (opportunità) | varies | `/contenuti/opportunita/[id]` | — |
| E12 | Contenuto pubblicato (sconto) | varies | `/contenuti/sconti/[id]` | — |
| E13 | Reminder lezione | "lezione" / "reminder" | `/corsi/[id]` | Lesson date/time present |
| E14 | Assegnazione CoCoD'à | "assegnazione" | `/corsi/assegnazione` | Corso name present |

If `template:E<N>` is specified:
1. Verify the subject contains the expected partial string
2. Verify the CTA href contains the expected path pattern
3. Verify the key content field is not empty in the body

---

## Step 4 — Report

```
## Resend Verify — [DATE]
### Triggered by: [action / template:E<N>]
### Mode: [single | broadcast (N recipients)]

### Domain health
- testbusters.it: [verified ✅ | pending ⚠️ | not_started ❌]

### Email delivery
| To | Subject | Status | From ✅/❌ | CTA domain ✅/❌ | Tokens ✅/❌ |
|---|---|---|---|---|---|
| [email] | [subject] | delivered/bounced/... | ✅/❌ | ✅/❌ | ✅/❌ |

### Template checks (if E<N> specified)
- Subject match: ✅/❌ ([expected partial] found/not found)
- CTA path: ✅/❌ ([expected path] found/not found)
- Key content: ✅/❌

### Issues
[list any FAIL or WARN items with description and remediation]
```

**Block completion rule**: do NOT mark the triggering Phase 5c step as complete until `Status: delivered ✅` is confirmed. A `sent` status is not sufficient — it means the email left Resend but delivery to the recipient's mail server is unconfirmed.

---

## Usage notes

- **Address rule**: only send to `@test.com` or `@test.local` addresses during smoke tests. Never trigger sends to real user addresses during development.
- **Staging key**: the staging Resend API key is in `.env.local` — it may have delivery restrictions (e.g. only delivers to verified test addresses). If bounce is unexpected, check the key type.
- **Broadcast scale**: for content broadcasts to all active collaborators, only verify the first 3 emails — spot-check is sufficient. Note total send count in the report.
- **Re-run trigger**: if a template is updated and re-deployed, run `/resend-verify` again even without a new Phase 5c — template rendering issues can appear on the next send.
