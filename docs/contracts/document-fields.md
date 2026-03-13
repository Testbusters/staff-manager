# Document Fields Contract

> **Mandatory reference for any block touching document data.**
> Every block that modifies document schema, field permissions, upload flow, or signing
> must verify alignment across all entry points and update this document accordingly.

---

## Entry Points

| Entry point | Route / Component | Auth | Notes |
|---|---|---|---|
| **Admin upload** | `POST /api/documents` | `amministrazione` | Manual PDF upload |
| **Admin replace** | `PATCH /api/documents/[id]` | `amministrazione` | Replace file or update stato_firma |
| **Admin delete** | `DELETE /api/documents/[id]` | `amministrazione` | Hard delete + Storage cleanup |
| **Contract generation** | `POST /api/contracts/generate` | `amministrazione` | pdf-lib fill from template |
| **CU batch upload** | `POST /api/import/cu/run` | `amministrazione` | Bulk insert via GSheet+Drive |
| **Collaboratore sign** | `POST /api/documents/[id]/sign` | `collaboratore` (own, DA_FIRMARE only) | Guided sign flow |
| **Signed PDF recompile** | `POST /api/documents/[id]/sign-guided` | `collaboratore` | Embeds signature in PDF |
| **Receipt generation** | `POST /api/documents/generate-receipts` | `amministrazione` | Auto-generated on liquidate |

---

## Field Permission Matrix

| Campo | Admin Upload | Admin Edit | Contract Gen | Collab Sign | Notes |
|---|---|---|---|---|---|
| `collaborator_id` | ✅ required | ❌ immutable | ✅ required | ❌ immutable | — |
| `tipo` | ✅ required | ✅ | ✅ (derived) | ❌ | `CONTRATTO_OCCASIONALE \| CU \| RICEVUTA_PAGAMENTO` |
| `macro_type` | — (generated) | — | — | — | Generated column: `CONTRATTO \| CU \| RICEVUTA` |
| `file_url` | ✅ required | ✅ (replace) | ✅ (generated) | ✅ (updated on sign) | Storage private bucket path |
| `stato_firma` | ✅ (default DA_FIRMARE) | ✅ | ✅ (default DA_FIRMARE) | ✅ (→ FIRMATO on sign) | `DA_FIRMARE \| FIRMATO \| NON_RICHIESTO` |
| `template_type` | ✅ (optional) | ✅ | ✅ required | ❌ | `OCCASIONALE \| RICEVUTA_PAGAMENTO` |
| `anno_cu` | ✅ (CU only) | ✅ | — | ❌ | Year reference for CU type |
| `nome_pdf` | ✅ (optional) | ✅ | ✅ | ❌ | Display name shown in UI |

---

## State Transition Permissions

| Transition | From | To | Role | Notes |
|---|---|---|---|---|
| sign | DA_FIRMARE | FIRMATO | `collaboratore` | Own document only; guided flow |
| admin reset | FIRMATO | DA_FIRMARE | `amministrazione` | Via PATCH with `stato_firma` field |
| mark non-required | any | NON_RICHIESTO | `amministrazione` | Terminal state — no further transitions |

---

## Document Types and Generation

| Tipo | macro_type | Generated via | Template |
|---|---|---|---|
| `CONTRATTO_OCCASIONALE` | `CONTRATTO` | `docxtemplater` (DOCX) or `pdf-lib` | `contract_templates` table |
| `CU` | `CU` | Drive download + Storage upload | Google Drive folder |
| `RICEVUTA_PAGAMENTO` | `RICEVUTA` | `pdf-lib` fill | `contract_templates` table |

**Unique constraint**: max 1 `CONTRATTO_OCCASIONALE` per collaborator (partial unique index on `macro_type='CONTRATTO'`).

---

## Validation Rules

| Campo | Rule |
|---|---|
| `tipo` | Must be one of the 3 allowed values |
| `stato_firma` | Must be one of 3 allowed values |
| `file_url` | Non-empty string; Storage path (not signed URL) |
| `template_type` | Required when `tipo=CONTRATTO_OCCASIONALE` or `RICEVUTA_PAGAMENTO` |

---

## Dependency Check Protocol

Before starting any block that touches document data:

1. **Schema change** (new column): update this matrix + upload form + API validation + DocumentList component
2. **State machine change**: update transition logic + sign route + admin edit route + DocumentList UI
3. **RLS change**: verify `macro_type` generated column filter is used (not `like.CONTRATTO_%`)
4. **Template change**: update `lib/pdf-utils.ts` or `docxtemplater` vars + test with real PDF

---

## Known Constraints

- Storage bucket is **private** — always use signed URLs (1h TTL via service role). Never expose raw Storage paths to the client.
- `macro_type` is a **generated column** — cannot be set directly. Filter with `eq('macro_type', 'CONTRATTO')`, not `like.CONTRATTO_%` (causes PostgREST SyntaxError).
- PDF fill calibration constants are in `lib/pdf-utils.ts` — do not change `leftPad`, `rightExtension`, `height` formula without re-running calibration tests.
- `docxtemplater` syntax uses single braces `{variabile}` — must pass `nullGetter: () => ''` to avoid throws on unset variables.
- CU batch import downloads from Google Drive (`CONTRATTI_DRIVE_FOLDER_ID`) — requires `GOOGLE_SERVICE_ACCOUNT_JSON` env.
