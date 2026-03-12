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

| Skill | Action |
|---|---|
| `/arch-audit` | Weekly compliance audit: fetches latest Anthropic docs + release notes, compares with local architecture, auto-fixes safe items, lists recommendations |
| `/ui-audit` | Full UI/UX quality audit: reads `docs/sitemap.md` as file inventory, runs 9 grep checks + 4 supplemental checks (design tokens, responsive grids, empty states, accessibility), produces verdict table ✅/❌ per check. Audit-only — no code changes without confirmation. |

> `/arch-audit` **Trigger**: SessionStart hook warns if ≥7 days since last run. Timestamp: `~/.claude/projects/.../last-audit`
> `/ui-audit` **When to run**: after any UI wave, before merging a worktree, or on demand to verify design system compliance.

---

## MCP Servers (active in this project)

| Server | Key tools |
|---|---|
| **Supabase** | `execute_sql`, `list_tables`, `apply_migration`, `get_logs` |
| **Resend** | `resend_list_emails`, `resend_get_email`, `resend_send_email` — use for email delivery verification in smoke tests |
| **Slack** | `slack_send_message`, `slack_read_channel`, `slack_search_public` |
| **Gmail** | `gmail_search_messages`, `gmail_read_thread`, `gmail_create_draft` |
| **Google Calendar** | `gcal_list_events`, `gcal_create_event`, `gcal_find_meeting_times` |
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
