# Reference Documents — Full Index

Reference file delegated from CLAUDE.md. These files contain authoritative specs not derivable from code.
Consult the relevant file before planning or implementing any block that touches the listed domain.

## Mandatory-first lookups (read BEFORE the dependency scan)

| File | When to read |
|---|---|
| `docs/entity-manifest.md` | Any block touching a domain entity (profile, compensation, reimbursement, document, ticket, content). Maps entity → roles → surfaces → contract file. |
| `docs/prd/01-rbac-matrix.md` | Any block touching role permissions, RBAC rules, member_status restrictions, or adding a new role/entity. Role × Entity × Action cross-cutting table. |
| `docs/profile-editing-contract.md` | Any block touching collaborator profile fields, permissions, or edit flows. Contains field × entry point matrix and validation rules. |
| `docs/ui-components.md` | Any block introducing new UI. Permanent Component Map, Badge mapping, Dialog/Sheet/Tooltip patterns, e2e selector strategy. |
| `docs/sitemap.md` | Before cross-cutting Grep/Explore across multiple pages (responsive audit, token normalization, empty-state sweep). Also in Phase 1 for route/role changes. |

## Secondary references (read when the block touches the specific area)

- **Session recovery**: `.claude/session/` — temporary per-block files, one per active block. Read at session start (Phase 0) to resume interrupted work.
- **Product spec**: `docs/requirements.md` — feature requirements by block.
- **Progress tracker**: `docs/implementation-checklist.md` — block status and log.
- **Tech debt backlog**: `docs/refactoring-backlog.md` — structural issues and open items.
- **Migration history**: `docs/migrations-log.md` — applied migration history.
- **Entity contracts**: `docs/contracts/` — one file per entity. Field × entry point × permission matrices, state transition rules, validation rules, known constraints. Files: `compensation-fields.md`, `reimbursement-fields.md`, `document-fields.md`, `ticket-fields.md`, `content-fields.md`.
- **PRD** (living document): `docs/prd/prd.md` — source of truth. Read for broader product context before planning any block that introduces a new feature area or touches cross-cutting behaviour. Updated in Phase 8 step 2f (mandatory, every block). GDoc presentation layer: append Changelog only — script in `.claude/rules/gdoc-append.md`.
- **Design system**: `docs/design-system.md` — color token values (light/dark resolved), base scale, Figma Foundation TB (General, Status, Action, Alpha, Gradient, Accent, Service scales). Read when writing new UI that requires precise token or color decisions.
- **Functional dependency map**: `docs/dependency-map.md` — entity → surfaces lookup. Mandatory first step of the Phase 1 dependency scan. Lists all pages, API routes, lib files, types, and docs that depend on each major entity.

## Update rules (Phase 8)

| Step | File to update | Trigger |
|---|---|---|
| 2b | `docs/profile-editing-contract.md` | Block touched collaborator profile fields or edit flows |
| 2b2 | `docs/contracts/<entity>.md` | Block modified a domain entity |
| 2c | `docs/sitemap.md` | Block added/removed a route, changed role access, or updated sidebar |
| 2d | `docs/db-map.md` | Block applied a migration |
| 2e | `docs/prd/01-rbac-matrix.md` | Block changed role permissions or added a new role |
| 2f | `docs/prd/prd.md` + GDoc | Every block — no exceptions |
