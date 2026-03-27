# PDF / Document Generation Patterns

Reference file for blocks touching `lib/pdf-utils.ts`, `lib/document-generation.ts`, or `lib/docx-generation.ts`.

## pdfjs-dist v5 + pdf-lib (server-side)

- Import path: `pdfjs-dist/legacy/build/pdf.mjs`
- **CRITICAL**: add both `pdfjs-dist` and `pdf-lib` to `serverExternalPackages` in `next.config.ts`
- Font for replacement text is **CourierBold** (NOT Helvetica — matches Courier New template)
- Full calibration: leftPad, rightExtension, height formula, Case 2 trailing underscores, Case 3 `__ERASE__`, Google Docs quirk — see inline comments in `lib/pdf-utils.ts`

## Template fill calibration constants

- `leftPad`: horizontal offset from the field's left edge to the replacement text start
- `rightExtension`: number of trailing underscore chars to draw after the value to fill the line
- Height formula: `fieldHeight * 0.72` (empirical — matches Courier New baseline)
- **Case 2** (value + trailing underscores): use `rightExtension` to pad to original line length
- **Case 3** (`__ERASE__` marker): write empty string, no underscores — completely blanks the field
- **Google Docs quirk**: exported PDFs have AcroForm fields with slightly different bounding boxes than LibreOffice — always test calibration against the actual template in use

## Community-aware ritenuta

- `lib/ritenuta.ts` — pure, client-safe helpers (no pdfjs/pdf-lib deps)
- `calcRitenuta(communityName, lordo)` → TB = `lordo × 0.20`, P4M = `lordo × 0.60 × 0.20`
- Also: `getContractTemplateTipo(communityName)` and `getReceiptTemplateTipo(communityName)`
- Re-exported from `lib/document-generation.ts` for server routes
- **Client components must import directly from `lib/ritenuta.ts`** — `lib/document-generation.ts` has server-only pdfjs/pdf-lib deps
- Community name fetched from `collaborator_communities JOIN communities` — `.maybeSingle()` safe due to UNIQUE constraint (migration 044)

## docxtemplater

- Syntax: `{variabile}` (single brace, NOT double)
- Mandatory option: `nullGetter: () => ''` — without this, unset variables throw
- Dynamic server-side import: `await Promise.all([import('pizzip'), import('docxtemplater')])`
- **Vars dual-name**: same `vars` dict contains both OCCASIONALE names (`luogo_nascita`, `comune`, …) and COCOCO names (`citta_nascita`, `citta_residenza`, `civico_residenza`, …) — docxtemplater silently ignores keys absent from the template. No branching needed.
- Best-effort generation: if template absent or error, continue without rollback (do not throw)

## Storage

- Do NOT use browser client for Supabase Storage. Centralize in API routes with service role client (bypasses RLS/policies).
