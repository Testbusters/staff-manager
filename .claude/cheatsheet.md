# Claude Code + iTerm2 — Cheat Sheet

> Staff Manager project — quick reference for shortcuts, commands, and custom skills

---

## iTerm2 — Tabs & Panels

| Shortcut | Action |
|---|---|
| `Cmd+T` | New tab |
| `Cmd+W` | Close tab/panel |
| `Cmd+Shift+]` / `[` | Next / previous tab |
| `Cmd+D` | Split vertical |
| `Cmd+Shift+D` | Split horizontal |
| `Cmd+Option+↑↓←→` | Navigate panels |
| `Cmd+Option+E` | Tab Exposé (overview) |
| `Cmd+Option+I` | Broadcast input to all panels (orange border = active) |
| `Cmd+Shift+S` | Save window arrangement |

---

## iTerm2 — Shell Integration

| Shortcut / Command | Action |
|---|---|
| `Cmd+Shift+↑/↓` | Jump to previous/next prompt |
| `Cmd+Shift+A` | Select last command output → paste into Claude |
| `Cmd+Option+/` | Recent Directories |
| `Cmd+Shift+B` | Toolbelt (command history) |
| `imgcat <file>` | Render image inline in terminal |
| `it2attention start` | Flash dock icon |

---

## iTerm2 — Log Triggers (Next.js panel)

| Regex | Highlight |
|---|---|
| `(?i)(error\|TypeError\|SyntaxError)` | 🔴 Red — runtime/compile errors |
| `(?i)(warn\|deprecated)` | 🟡 Yellow — warnings |
| `(Ready\|compiled successfully)` | 🟢 Green — build OK |
| `\s(4\d{2}\|5\d{2})\s` | 🟠 Orange — HTTP 4xx/5xx |
| `(?i)(fatal\|SIGTERM\|OOM)` | 🔴 Notification — critical errors |

> Enable "Instant" checkbox on all triggers for real-time activation.

---

## Claude Code — Session

| Command | Action |
|---|---|
| `/clear` | Clear conversation context |
| `/compact [note]` | Compact conversation (saves tokens, CLAUDE.md survives) |
| `/model <name>` | Switch model: `sonnet`, `opus`, `haiku` |
| `/config` | Toggle thinking mode, fast mode, etc. |
| `/permissions` | Manage tool permissions |
| `/memory` | View/edit CLAUDE.md and auto-memory files |
| `/resume` | Resume a previous session |
| `/rename` | Rename current session |
| `/status` | Show session status and context usage |
| `/context` | Show context window breakdown |
| `/btw <question>` | Ask a side question — no tools, answer discarded from context |
| `/copy` | Interactive picker for code blocks |
| `/bug` | Report a bug to Anthropic |
| `Cmd+C` (×2) | Interrupt current Claude operation |

---

## Claude Code — Agents & Plans

| Command | Action |
|---|---|
| `/plan [description]` | Enter plan mode (read-only, no edits until confirmed) |
| `/agents` | View, create, or edit sub-agents |
| `/hooks` | Configure hooks interactively |
| `/mcp` | Manage MCP servers, authenticate OAuth |
| `/init` | Generate CLAUDE.md from current codebase |

---

## Claude Code — Built-in Skills

| Skill | Action |
|---|---|
| `/simplify` | Review changed code for quality/reuse and fix in-place |
| `/batch` | Orchestrate large parallel changes across many files |
| `/loop [interval] [skill]` | Run a prompt/skill on a recurring interval (e.g. `/loop 5m /arch-audit`) |
| `/debug` | Troubleshoot current session |
| `/claude-api` | Load Claude API reference into context |
| `/install-github-app` | Set up GitHub Actions integration |

---

## Claude Code — Custom Skills (this project)

| Skill | Scope | When to run |
|---|---|---|
| `/arch-audit` | Claude Code architecture compliance: fetches latest Anthropic docs + release notes, compares with local `.claude/` setup, auto-fixes safe items | Weekly (SessionStart hook warns if ≥7 days). Timestamp: `~/.claude/projects/.../last-audit` |
| `/ui-audit [screenshots]` | **shadcn compliance only**: design tokens (G1–G8), component adoption (S1–S5), accessibility attrs, table layout rules. Static + optional live screenshots. Does NOT cover UX flows or responsiveness. | After any UI wave, before merging a worktree |
| `/ui-audit screenshots full` | Same as above but captures all routes via Playwright | Full pre-merge review |
| `/responsive-audit` | Breakpoints 375/768/1024px — only collab+responsabile routes (admin excluded). 6 checks: overflow, table scaling, text truncation, 44px tap targets, stacked layout, modal fit. PASS/WARN/FAIL per route×breakpoint | After layout or grid changes |
| `/ux-audit` | User experience quality: simulates F1–F5 flows (standard) or F1–F10 (full) via Playwright per role. Evaluates 6 UX dimensions D1–D6. Severity-ranked report Critical/Major/Minor with fix proposals | Before feature releases, after significant flow changes |
| `/visual-audit [quick\|full\|page:<route>]` | Aesthetic quality: takes live screenshots in light + dark mode, scores each page on 7 visual dimensions V1–V7 (typography, spacing, hierarchy, colour, density, dark-mode, micro-polish). Score 1–5 per dimension. Critical/Major findings with concrete fix suggestions. Can invoke `/frontend-design` for before/after mockups | On demand — when the app "looks wrong" or before a client demo |
| `/skill-dev` | Code quality and technical debt: coupling, duplication, dead code, pattern inconsistencies, magic strings, `@ts-ignore`, prop drilling, over-large components. Uses `docs/sitemap.md` as guide. Outputs to `docs/refactoring-backlog.md` | Periodically — before major refactoring, quarterly review |
| `/skill-db` | DB schema and query quality: missing indexes, normalization, RLS gaps, constraint completeness, N+1 in API routes, cascade behavior. Uses `docs/db-map.md` as guide. Outputs to `docs/refactoring-backlog.md` | After any migration wave; before production releases |
| `/security-audit` | Security review: auth guards on all routes, RLS completeness, Zod coverage, sensitive data in responses, HTTP security headers, proxy bypass. Internal app — SEO/indexing out of scope. Outputs to `docs/refactoring-backlog.md` | Before each production deploy; after adding new API routes |
| `/api-design` | API consistency: HTTP verb correctness, URL structure, response shape, error codes, pagination patterns, validation placement. Outputs to `docs/refactoring-backlog.md` | After adding 3+ new routes; quarterly |
| `/perf-audit` | Performance: server/client boundaries, unnecessary `use client`, heavy lib bundling, useEffect data fetching, image optimization, unbounded queries, serial awaits. Internal app — CWV/SEO out of scope. Outputs to `docs/refactoring-backlog.md` | Before production releases; after major UI additions |

> **Rule**: every new custom skill must be added to this table immediately after creation.
> **Prerequisites for screenshot-based skills**: `npm run dev` must be running on `localhost:3001` (worktree) or `localhost:3000` (main).
> **MCP Playwright**: uses bundled Chromium (`--browser chromium`) — no conflict with open Chrome. Requires Claude Code restart after `~/.claude.json` changes.

---

## MCP Servers (active in this project)

| Server | Key tools |
|---|---|
| **Supabase** | `execute_sql`, `list_tables`, `apply_migration`, `get_logs` |
| **Resend** | `resend_list_emails`, `resend_get_email`, `resend_send_email` — use for email delivery verification in smoke tests |
| **Slack** | `slack_send_message`, `slack_read_channel`, `slack_search_public` |
| **Gmail** | `gmail_search_messages`, `gmail_read_thread`, `gmail_create_draft` |
| **Google Calendar** | `gcal_list_events`, `gcal_create_event`, `gcal_find_meeting_times` |
| **shadcn** | Component docs, props, variants, install commands — query before writing any new UI component not yet in `docs/ui-components.md`. Configured globally in `~/.claude.json`. |
| **ClickUp** | `clickup_create_task`, `clickup_search`, `clickup_update_task` |
| **n8n** | `search_workflows`, `execute_workflow`, `get_workflow_details` |

---

## CLI Piping — Shell → Claude

| Command | Action |
|---|---|
| `git diff \| claude` | Review current changes |
| `git log \| claude` | Summarize recent commits |
| `npm test 2>&1 \| claude` | Analyse test failures |
| `cat error.log \| claude` | Debug a log file |
| `claude --print 'prompt'` | Non-interactive Claude (for scripts) |

---

## Git Worktrees

| Command | Action |
|---|---|
| `git worktree add <path> <branch>` | Create worktree on a separate branch |
| `git worktree list` | List all active worktrees |
| `git worktree remove <path>` | Remove completed worktree |

> `node_modules` and `.next` are auto-symlinked into new worktrees (configured in `.claude/settings.json`).

---

## Terminal Tools

| Tool | Use |
|---|---|
| `glow <file.md>` | Render Markdown in terminal |
| `bat <file>` | `cat` with syntax highlighting |
| `lazygit` | Full git TUI |
| `yazi` | File manager (replaces ls/cd) |
| `fzf` | Fuzzy finder (files, history, git) |
| `ripgrep (rg)` | Fast code search |
| `zoxide` | Smart `cd` (learns frequent dirs) |
| `btop` | System monitor (CPU, RAM, network) |

```bash
brew install glow bat lazygit yazi fzf ripgrep zoxide btop
```

---

## This Cheatsheet

```bash
# View anytime
glow /Users/MarcoG/Projects/staff-manager/.claude/cheatsheet.md

# iTerm2 permanent tab: create a profile with this start command:
glow /Users/MarcoG/Projects/staff-manager/.claude/cheatsheet.md; $SHELL
```
