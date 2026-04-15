# Playwright e2e Patterns

Reference file for blocks writing or modifying `e2e/` specs.

## Test setup

- **Test user creation**: for multi-step flows (login → wizard → generate contract), create user directly via REST Admin API in `beforeAll` with `must_change_password=false` + `onboarding_completed=false`. Pattern: POST `/auth/v1/admin/users`, POST `/rest/v1/user_profiles`, POST `/rest/v1/collaborators`. Avoids dependency on admin UI create-user flow.
- **cleanup-first**: user cleanup must be the FIRST operation in `beforeAll`, BEFORE `fs.readFileSync` or any throwing operations. If `beforeAll` fails after creating users but before cleanup, users remain orphaned in subsequent runs.
- **deleteAuthUser with FK**: `documents` has FK `collaborator_id → collaborators.id`. Before `DELETE /auth/v1/admin/users/{id}`, delete linked documents via `DELETE /rest/v1/documents?collaborator_id=eq.{collab_id}`, otherwise delete fails with 500 FK violation.
- **afterAll — no delete fixture**: never call `fs.unlinkSync` on a path pointing to a fixture (`e2e/fixtures/...`). Use `os.tmpdir()` for real temp files. Fix: check `tmpPdfPath && fs.existsSync(tmpPdfPath)` only for the temp PDF.

## Serial test context

- **`{ page }` fixture in serial**: each test has a SEPARATE browser context — call `login()` explicitly at the start of every test, not just the first. If `page` is managed manually at describe level (via `beforeAll + browser.newPage()`), context is shared and sign-out is only needed for user switches.
- **User switch** (shared page only): if page is created in `beforeAll`, cookies persist. To switch user: `goto('/login')` → if redirected to `/` (active session) → click "Esci" → `waitForURL('/login')` → then normal login.

## Selectors

- **Status badges**: `[data-ticket-stato="..."]` (tickets) or `[data-stato="..."]` (compensations/expenses). Never use `span.text-{color}` — Badge renders `<div>`, not `<span>`.
- **Dialog scope**: `[data-slot="dialog-content"]` to scope selectors inside a Dialog.
- **`filter({ hasText })`**: for locators with special chars like `{` `}` use `.locator('code').filter({ hasText: '{nome}' }).first()` — more robust than `:has-text()` in CSS selector.
- **`:has-text()` substring match**: `button:has-text("Invia")` also matches "Inviato". Fix: scope to unique container (e.g. modal overlay `div.fixed.inset-0.z-50`) for all form interactions.
- **strict mode**: `locator('a[href=...]')` fails if multiple elements found. Use `.first()` or narrow the selector.
- **XPath following-sibling**: `page.locator('div').filter({ has: h3 }).first()` captures the OUTER CONTAINER. Fix: use `h3Locator.locator('xpath=following-sibling::div[1]')` to select the immediate sibling.

## Timing / stability

- **form→DB timing**: use `Promise.all([page.waitForResponse(...), async () => { fill; click }()])` before checking DB — without this, DB assertion runs before the API completes.
- **Bell icon click timeout**: wait for badge to be visible (`expect(badge).toBeVisible`) BEFORE clicking bell — ensures component has finished fetching.
- **`waitForLoadState('networkidle')` with NotificationBell**: 30s polling prevents settle → use `domcontentloaded` on all app pages that mount NotificationBell.
- **opacity-0 elements**: elements with `opacity-0 group-hover:opacity-100` are not visible to Playwright → use `.click({ force: true })`. To target the dismiss button: `page.locator('div.group').filter({ hasText: '...' }).first().locator('button[aria-label="..."]')`.

## Rich text / formatting

- **Tiptap ProseMirror**: `Ctrl+B` keyboard shortcut does NOT work in headless. Use toolbar button click (`onMouseDown`) or apply block-level formatting (H2) before typing.

## Playwright MCP

- Fails when Chrome is running on macOS. See `memory/project_playwright_broken.md`.
