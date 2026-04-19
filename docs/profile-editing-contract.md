# Profile Editing Contract

> **Mandatory reference for any block touching collaborator profile data.**
> Every block that modifies the collaborator profile schema, field permissions, or edit flows
> must verify alignment across all three entry points and update this document accordingly.

---

## Entry Points

| Entry point | Route / Component | Auth | Notes |
|---|---|---|---|
| **Onboarding** | `POST /api/onboarding/complete` | Collaboratore (self) | First-time only; `onboarding_completed` must be false |
| **Self-edit** | `PATCH /api/profile` | Collaboratore (self) | Ongoing edits after onboarding |
| **Admin edit** | `PATCH /api/admin/collaboratori/[id]/profile` | `amministrazione` | All fields including IBAN |
| **Responsabile edit** | `PATCH /api/admin/collaboratori/[id]/profile` | `responsabile_compensi` (own communities only) | All fields except IBAN |
| **Username only** | `PATCH /api/admin/collaboratori/[id]` | `amministrazione`, `responsabile_compensi` (own communities) | Atomic username update |

---

## Field Permission Matrix

| Campo | Onboarding | Self-edit | Admin | Responsabile |
|---|---|---|---|---|
| `nome` | ✅ required | ✅ | ✅ | ✅ |
| `cognome` | ✅ required | ✅ | ✅ | ✅ |
| `username` | — (readonly preview) | ❌ not editable | ✅ (409 on conflict) | ✅ (409 on conflict) |
| `codice_fiscale` | ✅ required | ✅ | ✅ | ✅ |
| `data_nascita` | ✅ required | ✅ | ✅ | ✅ |
| `luogo_nascita` | ✅ required | ✅ | ✅ | ✅ |
| `provincia_nascita` | ✅ required | ✅ | ✅ | ✅ |
| `comune` | ✅ required | ✅ | ✅ | ✅ |
| `provincia_residenza` | ✅ required | ✅ | ✅ | ✅ |
| `indirizzo` | ✅ required | ✅ | ✅ | ✅ |
| `civico_residenza` | ✅ required | ✅ | ✅ | ✅ |
| `telefono` | ✅ required | ✅ | ✅ | ✅ |
| `iban` | ✅ required | ✅ | ✅ | ❌ sensitive |
| `intestatario_pagamento` | ✅ required | ✅ | ✅ | ❌ sensitive |
| `tshirt_size` | ✅ required | ✅ | ✅ | ✅ |
| `sono_un_figlio_a_carico` | ✅ | ✅ | ✅ | ✅ |
| `importo_lordo_massimale` | — | ✅ | ✅ | ✅ |
| `citta` | ✅ required | ✅ | ✅ (admin only) | ❌ read-only |
| `materie_insegnate` | ✅ required (≥1) | ✅ (≥1) | ✅ (admin only) | ❌ read-only |
| `email` | — | ✅ (via auth API) | — | ❌ |
| `foto_profilo_url` | — | ✅ (avatar upload) | — | ✅ (own avatar via dashboard) |
| `community_ids` | — | ❌ read-only (admin assigns only via /collaboratori/[id]) | ✅ (admin only) | ❌ |
| `telegram_chat_id` | — | ❌ (set/cleared via /api/telegram/connect + /api/telegram/webhook) | ✅ can reset via /api/admin/collaboratori/[id]/telegram | ❌ |
| `data_ingresso` | — | ❌ | ✅ (admin only) | ❌ |
| `tipo_contratto` | — | ❌ | ✅ (admin only) | ❌ |
| `numero_documento_identita` | ✅ required | ✅ | ✅ (via CreateUserForm at invite + /collaboratori/[id]) | ❌ not exposed |
| `tipo_documento_identita` | ✅ required (CI/PASSAPORTO/PATENTE) | ✅ | ✅ | ❌ not exposed |
| `scadenza_documento_identita` | ✅ required | ✅ | ✅ | ❌ not exposed |
| `ha_allergie_alimentari` | ✅ (default false) | ✅ | ✅ | ❌ not exposed |
| `allergie_note` | ✅ required if `ha_allergie_alimentari=true` | ✅ (required if flag) | ✅ (required if flag) | ❌ not exposed |
| `regime_alimentare` | ✅ (onnivoro/vegetariano/vegano, default onnivoro) | ✅ | ✅ | ❌ not exposed |
| `spedizione_usa_residenza` | ✅ (default true) | ✅ | ✅ | ❌ not exposed |
| `spedizione_indirizzo` | ✅ required if `spedizione_usa_residenza=false` | ✅ (required if flag false) | ✅ | ❌ not exposed |
| `spedizione_civico` | ✅ required if `spedizione_usa_residenza=false` | ✅ | ✅ | ❌ not exposed |
| `spedizione_cap` | ✅ required if `spedizione_usa_residenza=false` | ✅ | ✅ | ❌ not exposed |
| `spedizione_citta` | ✅ required if `spedizione_usa_residenza=false` | ✅ | ✅ | ❌ not exposed |
| `spedizione_provincia` | ✅ required if `spedizione_usa_residenza=false` | ✅ | ✅ | ❌ not exposed |
| `spedizione_nazione` | ✅ (default IT) | ✅ | ✅ | ❌ not exposed |
| `data_consenso_dati_salute` (on `user_profiles`) | — (server-derived) | — (server-derived) | — (server-derived) | — |

---

## Validation Rules (must be consistent across all entry points)

| Campo | Rule | Zod pattern |
|---|---|---|
| `codice_fiscale` | 16 alphanumeric uppercase | `/^[A-Z0-9]{16}$/` |
| `iban` | Uppercase, no spaces, country code prefix | `/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/` |
| `provincia_*` | 2 uppercase letters | `/^[A-Z]{2}$/` |
| `username` | Lowercase, alphanumeric + underscore, 3–50 chars | `/^[a-z0-9_]+$/` |
| `tipo_documento_identita` | Enum | `z.enum(['CI','PASSAPORTO','PATENTE'])` |
| `scadenza_documento_identita` | ISO date | `z.string().date()` |
| `regime_alimentare` | Enum | `z.enum(['onnivoro','vegetariano','vegano'])` |
| `spedizione_provincia` | 2 uppercase letters | `/^[A-Z]{2}$/` |
| `ha_allergie_alimentari + allergie_note` | Cross-field: if flag true → note required + GDPR consent | `superRefine` in `collaboratorBaseSchema` |
| `spedizione_usa_residenza + spedizione_*` | Cross-field: if flag false → 5 address fields required | `superRefine` in `collaboratorBaseSchema` + DB CHECK constraint |

---

## Dependency Check Protocol

Before starting any block that touches profile data:

1. **Schema change** (new column): update this matrix + all 5 entry points
2. **Validation change**: update both Zod schemas (self-edit + onboarding) AND server validation in admin/responsabile route
3. **Permission change** (new role gets access): update this matrix + the relevant API route + CollaboratoreDetail UI
4. **Field rename**: search all 5 entry points via Grep before declaring file list

---

## Known Constraints

- `IBAN` and `intestatario_pagamento` are treated as sensitive payment fields: visible to collaboratore and admin only.
- `username` is the import key for compensation ingestion — uniqueness is enforced at DB level (UNIQUE constraint) and via 409 error at API level.
- Community check for `responsabile_compensi`: verified via `user_community_access` JOIN `collaborator_communities` on the collaborator's ID.
- `onboarding_completed=false` guard is on `POST /api/onboarding/complete` only — repeated calls are rejected.
- **GDPR Art.9 — health data**: `data_consenso_dati_salute` on `user_profiles` is derived server-side. Set to `NOW()` when `ha_allergie_alimentari` transitions `false → true` (with explicit consent checkbox at collect time); set to `NULL` when `ha_allergie_alimentari` transitions to `false`. Never editable from client. Timestamped via `deriveConsensoDatiSaluteTimestamp()` in `lib/schemas/collaborator.ts`.
- **R7 — conservative RBAC for integrative data**: `responsabile_compensi` does not see documento/alimentazione/spedizione fields in `CollaboratoreDetail` UI; API schema accepts them but the UI never sends them. Do not relax without explicit privacy review.
- **R6 — soft backfill**: `ProfileBackfillToast` surfaces a Sonner toast on every login when `onboarding_completed=true` but `tipo_documento_identita IS NULL`. Dismissible 3x via `localStorage`; no hard gate.
- **CreateUserForm (admin)**: documento identità section (3 fields) appears only after community selection; optional at invite time (collected again at onboarding). Onboarding remains the single "first" collection point.
- **CHECK constraint (migration 078)**: DB enforces conditional requirement for spedizione fields when `spedizione_usa_residenza=false`. Zod `superRefine` mirrors the same rule client-side.
