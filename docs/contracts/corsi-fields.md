# Entity Contract — Corsi

> **Mandatory read** for any block touching corsi, lezioni, assegnazioni, candidature, blacklist, or allegati_globali.
> Created in block corsi-1 (2026-03-22).

---

## Tables

| Table | Purpose |
|---|---|
| `corsi` | Master course record |
| `lezioni` | Individual lessons belonging to a corso |
| `assegnazioni` | Assignment of a collaborator to a lezione with a ruolo |
| `candidature` | Applications: per-lezione (collab) or per-corso (city, resp.cittadino) |
| `blacklist` | Collaborators barred from teaching |
| `allegati_globali` | Global attachment files per tipo × community |

---

## corsi — Field Matrix

| Field | Type | Required | Entry point | Editable by |
|---|---|---|---|---|
| `id` | UUID | auto | — | — |
| `nome` | TEXT | ✅ | POST /api/corsi | admin |
| `codice_identificativo` | TEXT UNIQUE | ✅ | POST /api/corsi | admin |
| `community_id` | UUID FK→communities | ✅ | POST /api/corsi | admin |
| `modalita` | TEXT CHECK (online/in_aula) | ✅ | POST /api/corsi | admin |
| `citta` | TEXT | nullable | POST/PATCH | admin, resp.cittadino (city assignment — corsi-3) |
| `linea` | TEXT | nullable | POST/PATCH | admin |
| `responsabile_doc` | TEXT | nullable | POST/PATCH | admin |
| `licenza_zoom` | TEXT | nullable | POST/PATCH | admin |
| `data_inizio` | DATE | ✅ | POST /api/corsi | admin |
| `data_fine` | DATE | ✅ | POST /api/corsi | admin |
| `max_docenti_per_lezione` | INT DEFAULT 8 | ✅ | POST/PATCH | admin |
| `max_qa_per_lezione` | INT DEFAULT 6 | ✅ | POST/PATCH | admin |
| `link_lw` | TEXT | nullable | POST/PATCH | admin |
| `link_zoom` | TEXT | nullable | POST/PATCH | admin |
| `link_telegram_corsisti` | TEXT | nullable | POST/PATCH | admin |
| `link_qa_assignments` | TEXT | nullable | POST/PATCH | admin |
| `link_questionari` | TEXT | nullable | POST/PATCH | admin |
| `link_emergenza` | TEXT | nullable | POST/PATCH | admin |
| `created_by` | UUID FK→auth.users | ✅ | POST /api/corsi | — (immutable) |
| `created_at` | TIMESTAMPTZ | auto | — | — |

### Computed stato

`stato` is **not a DB column**. It is derived by `getCorsoStato(data_inizio, data_fine)` in `lib/corsi-utils.ts`:

```
data_inizio > today  →  programmato
data_fine < today    →  concluso
otherwise            →  attivo
```

---

## lezioni — Field Matrix

| Field | Type | Required | Entry point | Editable by |
|---|---|---|---|---|
| `id` | UUID | auto | — | — |
| `corso_id` | UUID FK→corsi (CASCADE) | ✅ | POST /api/corsi/[id]/lezioni | admin |
| `data` | DATE | ✅ | POST/PATCH | admin |
| `orario_inizio` | TIME | ✅ | POST/PATCH | admin |
| `orario_fine` | TIME | ✅ | POST/PATCH | admin |
| `ore` | NUMERIC(4,2) | GENERATED | — | — (computed) |
| `materie` | TEXT[] NOT NULL | ✅ | POST/PATCH | admin |
| `created_at` | TIMESTAMPTZ | auto | — | — |

> `ore` = `ROUND(CAST(EXTRACT(EPOCH FROM (orario_fine - orario_inizio)) / 3600 AS NUMERIC), 2)` — stored generated column. Never set directly.
> `materie` values come from `lookup_options` type='materia', community-specific. Array with CHECK `array_length(materie, 1) >= 1` (migration 069 — renamed from scalar `materia` to support multi-materia lessons, e.g. `['Matematica', 'Fisica']`). Values normalized to Title Case on import (Q3a override). Zod validation: `z.array(z.string().min(1)).min(1)`.

---

## assegnazioni — Field Matrix

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | auto | — |
| `lezione_id` | UUID FK→lezioni (CASCADE) | ✅ | — |
| `collaborator_id` | UUID FK→collaborators (CASCADE) | ✅ | — |
| `ruolo` | TEXT CHECK (docente/cocoda/qa) | ✅ | — |
| `valutazione` | NUMERIC(3,1) | nullable | Range 1.0–10.0 |
| `created_by` | UUID FK→auth.users | ✅ | — |
| `created_at` | TIMESTAMPTZ | auto | — |

UNIQUE constraint: `(lezione_id, collaborator_id, ruolo)`.

---

## candidature — Field Matrix

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | auto | — |
| `tipo` | TEXT CHECK (docente_lezione/qa_lezione/citta_corso) | ✅ | — |
| `lezione_id` | UUID FK→lezioni (nullable) | conditional | Required for tipo=docente_lezione or qa_lezione |
| `corso_id` | UUID FK→corsi (nullable) | conditional | Required for tipo=citta_corso |
| `collaborator_id` | UUID FK→collaborators (nullable) | — | For collab candidature |
| `city_user_id` | UUID FK→auth.users (nullable) | — | For resp.cittadino candidature |
| `stato` | TEXT DEFAULT 'in_attesa' | ✅ | Values: in_attesa, accettata, ritirata |
| `created_at` | TIMESTAMPTZ | auto | — |

CONSTRAINT: exactly one of `lezione_id` or `corso_id` must be non-null (CHECK constraint).

---

## blacklist — Field Matrix

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | auto | — |
| `collaborator_id` | UUID FK→collaborators (CASCADE) | ✅ | UNIQUE — only 1 entry per collaborator |
| `note` | TEXT | nullable | — |
| `created_by` | UUID FK→auth.users | ✅ | — |
| `created_at` | TIMESTAMPTZ | auto | — |

Duplicate insert → Postgres error code `23505` → API returns 409.

---

## allegati_globali — Field Matrix

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | auto | — |
| `tipo` | TEXT CHECK (docenza/cocoda) | ✅ | — |
| `community_id` | UUID FK→communities | ✅ | — |
| `file_url` | TEXT | ✅ | Storage path in `corsi-allegati` bucket |
| `nome_file` | TEXT | ✅ | Original filename |
| `updated_by` | UUID FK→auth.users | ✅ | — |
| `updated_at` | TIMESTAMPTZ | auto | — |

UNIQUE constraint: `(tipo, community_id)`. Use UPSERT (ON CONFLICT DO UPDATE) when replacing.

---

## RLS Summary

| Table | All authenticated | Admin | Resp.cittadino | Collaboratore |
|---|---|---|---|---|
| `corsi` | SELECT | INSERT, UPDATE, DELETE | — (corsi-3) | — (corsi-2) |
| `lezioni` | SELECT | INSERT, UPDATE, DELETE | — | — |
| `assegnazioni` | SELECT | INSERT, UPDATE, DELETE | — (corsi-3) | — |
| `candidature` | SELECT | full | INSERT (citta_corso) — corsi-3 | INSERT (docente/qa_lezione) — corsi-2 |
| `blacklist` | SELECT | full | — | — |
| `allegati_globali` | SELECT | full | — | — |

---

## API Routes

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/corsi` | all authenticated | Returns corsi with computed stato; filtered by role |
| POST | `/api/corsi` | admin | Creates corso; validates required fields |
| GET | `/api/corsi/[id]` | all authenticated | Returns corso + lezioni[] |
| PATCH | `/api/corsi/[id]` | admin + resp.cittadino | Admin: all fields. Resp.cittadino: citta only (corsi-3) |
| DELETE | `/api/corsi/[id]` | admin | Cascades to lezioni → assegnazioni/candidature |
| GET | `/api/corsi/[id]/lezioni` | all authenticated | Ordered by data, orario_inizio |
| POST | `/api/corsi/[id]/lezioni` | admin | — |
| PATCH | `/api/corsi/[id]/lezioni/[lid]` | admin | — |
| DELETE | `/api/corsi/[id]/lezioni/[lid]` | admin | Cascades to assegnazioni/candidature |
| GET | `/api/admin/blacklist` | admin | Returns entries with collaborator join |
| POST | `/api/admin/blacklist` | admin | 409 on duplicate |
| DELETE | `/api/admin/blacklist/[id]` | admin | — |
| GET | `/api/admin/allegati-corsi` | admin | — |
| POST | `/api/admin/allegati-corsi` | admin | multipart/form-data; uploads to `corsi-allegati` bucket |
| POST | `/api/admin/import-corsi/run` | admin | GSheet import (body `{notify:boolean}`). Service role. Response `{results[], errors[], summary:{processed,errorCount,skipped}}`. Best-effort rollback on lezioni insert failure (DELETE corso CASCADE). Cross-tab duplicate `codice_identificativo` detection pre-emptive. |

### candidature filter — docente_lezione overlap

`POST /api/candidature` with `tipo='docente_lezione'`: fetches `lezione.materie[]` and `collaborator.materie_insegnate[]`, returns 422 if no overlap. `qa_lezione` and `citta_corso` unaffected.

### valutazioni aggregation — per-materia split

`/api/corsi/[id]/valutazioni` uses `.contains('materie', [materia])` (array operator) for filtering. The resp.cittadino valutazioni page (`app/(app)/corsi/valutazioni/page.tsx`) iterates `lezione.materie[]` per docente and contributes to N buckets (one per materia). 80% threshold computed on lezioni-with-that-materia, not on total.

---

## Known Constraints

- `lezioni.ore` is a GENERATED ALWAYS AS STORED column — never include it in INSERT payloads.
- `lezioni.materie` is `TEXT[] NOT NULL` with CHECK `array_length(materie, 1) >= 1` (migration 069). Always provide at least one string. Values Title Case on import.
- `corsi.codice_identificativo` is UNIQUE (migration 069). Duplicate insert returns Postgres `23505` → import API writes ERROR to origin cell and skips tab.
- `candidature` CHECK requires exactly one of `lezione_id`/`corso_id` non-null.
- `candidature` `docente_lezione`: 422 if `collaborator.materie_insegnate` has no overlap with `lezione.materie`.
- `blacklist.collaborator_id` is UNIQUE — inserting a duplicate returns Postgres error `23505`.
- `allegati_globali` UNIQUE on `(tipo, community_id)` — always use UPSERT pattern.
- `getCorsoStato()` uses today's date at midnight (local time) — consistent with ISO date string comparison.

---

## Import Source — Google Sheet

Shared helpers in `lib/google-sheets-shared.ts` (extracted from `lib/google-sheets.ts` — `getToken`, `pemToDer`). Corsi-specific parser in `lib/corsi-import-sheet.ts`.

Env var: `IMPORT_CORSI_SHEET_ID` (staging fallback: `1UC8LXU430ks0CXWnjmzI2SDlWFYYcf8eKbVb6wHFwAk`).

Layout: 1 tab = 1 corso. Col A-E = lezioni, Col G-H = metadati corso. Cell `Sincronizzato con il gestionale` (idempotency marker): `TO_PROCESS` → `PROCESSED` after successful import (single batchUpdate at end). 429 retry with exponential backoff. Materie normalization: case-insensitive lookup, output Title Case (Q3a override). Città `ASSEGNAZIONE` → NULL. Materia M&F → `['Matematica', 'Fisica']` (1 lezione composita).
