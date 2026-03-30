# Context Map — Staff Manager

Gerarchia completa dei file di contesto Claude: regole, skills, documentazione, memory.
Riferimento rapido per iTerm2.

---

## Entry point

| File | Percorso assoluto | Descrizione |
|---|---|---|
| CLAUDE.md | `~/Projects/staff-manager/CLAUDE.md` | Entry point principale — gitignored |
| Auto-memory | `~/.claude/projects/-Users-MarcoG-Projects-staff-manager/memory/MEMORY.md` | Indice auto-memory — caricato automaticamente ad ogni sessione |

---

## `.claude/` — Configurazione e contesto Claude

```
~/Projects/staff-manager/.claude/
│
├── settings.json                    Hook PreToolUse: blocca execute_sql su prod, git push su main/staging
├── settings.local.json              Override locali di sessione (es. Phase 4/5d suspended)
├── cheatsheet.md                    Riferimento rapido: tutte le skills + quando usarle
├── files-guide.md                   Mappa dei file caricati automaticamente
├── ui-kit-adoption.md               Tracker adozione componenti shadcn/ui
│
├── agents/
│   └── dependency-scanner.md        Agente custom: scansione dipendenze Phase 1
│
├── rules/                           Regole caricate da CLAUDE.md via @-import
│   ├── pipeline.md                  ★ CENTRALE: workflow Phase 0→8.5 + Fast Lane
│   ├── pipeline-standards.md        Standard S1–S9 (DORA, Fowler, Anthropic, Conventional Commits)
│   ├── ui-design.md                 Regole UI obbligatorie: token, componenti shadcn, tabelle
│   ├── reference-docs.md            Indice docs di riferimento + update rules Phase 8
│   ├── output-style.md              Regole stile risposta: punteggiatura, tono, vocabolario
│   ├── context-review.md            Checklist Phase 8.5 — C1–C13
│   ├── claudemd-standards.md        Standard S1–S9 per CLAUDE.md: dimensione, contenuto, hook
│   ├── pdf-patterns.md              Pattern pdfjs-dist, pdf-lib, docxtemplater, ritenuta
│   ├── playwright-patterns.md       Pattern e2e: selectors, timing, serial context, setup
│   ├── gdoc-append.md               Script Node.js per append Changelog GDoc (Phase 8 step 2f)
│   └── prompt-quality-rubric.md     SUSPENDED — rubrica hook T1–T5 (solo documentazione)
│
├── skills/                          Skills su richiesta — invocate con /nome-skill
│   ├── arch-audit/SKILL.md          /arch-audit     Audit architettura + standards (17 check)
│   ├── api-design/SKILL.md          /api-design     Audit design API routes
│   ├── commit/SKILL.md              /commit         Conventional Commits automatici
│   ├── perf-audit/SKILL.md          /perf-audit     Performance: RSC, bundle, await waterfalls
│   ├── phase-design/SKILL.md        /phase-design   Phase 1.6: wireframe + UX review (Opus)
│   ├── resend-verify/SKILL.md       /resend-verify  Verifica email Resend dopo invio
│   ├── responsive-audit/SKILL.md    /responsive-audit  Responsive 375–1440px
│   ├── security-audit/SKILL.md      /security-audit Auth, Zod, RLS, secret exposure
│   ├── skill-db/SKILL.md            /skill-db       Schema DB: RLS, indici, FK, cascade
│   ├── skill-dev/SKILL.md           /skill-dev      TypeScript safety, React antipattern, coupling
│   ├── ui-audit/SKILL.md            /ui-audit       Token semantici, componenti shadcn, a11y
│   ├── ux-audit/SKILL.md            /ux-audit       Flussi utente, feedback, empty states
│   └── visual-audit/SKILL.md        /visual-audit   Contrasto, spacing, dark/light theme
│
└── session/                         File temporanei per sessioni attive (vuoto = nessun blocco)
```

---

## `docs/` — Documentazione progetto

```
~/Projects/staff-manager/docs/
│
├── implementation-checklist.md      Tracker blocchi: status ✅/🔄, log date+files+note
├── requirements.md                  Spec funzionale per blocco
├── entity-manifest.md               Entità → ruoli → superfici → contract file
├── dependency-map.md                Entità → pagine/routes/lib che dipendono da essa (Phase 1 dep scan)
├── sitemap.md                       Tutte le route: ruoli, layout, componenti chiave, loading.tsx
├── db-map.md                        Schema DB: tabelle, FK, indici, RLS summary + Column specs
├── design-system.md                 Token colore (light/dark resolved), scala base, Figma Foundation TB
├── ui-components.md                 Component Map shadcn, Badge mapping, Dialog/Sheet pattern, e2e selectors
├── profile-editing-contract.md      Matrice campo × entry point per profilo collaboratore
├── migrations-log.md                Log migrazioni applicate (numero, nome, data, staging/prod)
├── refactoring-backlog.md           Backlog strutturale: PERF- DEV- SEC- DB- A- T- N- (da audit e blocchi)
├── context-map.md                   ← questo file
│
├── prd/
│   ├── prd.md                       PRD living document — aggiornato ogni blocco (Phase 8 step 2f)
│   └── 01-rbac-matrix.md            Matrice RBAC: ruolo × entità × azione
│
└── contracts/                       Contratti entità: campi, stato macchina, validazioni, entry points
    ├── compensation-fields.md
    ├── reimbursement-fields.md
    ├── document-fields.md
    ├── ticket-fields.md
    ├── content-fields.md
    └── corsi-fields.md
```

---

## Auto-memory — `~/.claude/projects/.../memory/`

```
~/.claude/projects/-Users-MarcoG-Projects-staff-manager/memory/
│
└── MEMORY.md                        ★ Unico file — caricato automaticamente ad ogni sessione
                                     Sezioni: Active plan · Key technical patterns · Ownership columns
                                     · DB field semantics · Commit rules · Bash permissions
                                     · Canonical test credentials · Naming convention
                                     · Refactoring backlog · Reference memory files
```

---

## Note operative

- **CLAUDE.md e auto-memory** non sono in git (gitignored / fuori dal repo)
- **Aggiornamenti Phase 8**: `docs/prd/prd.md` (2f), `docs/sitemap.md` (2c), `docs/db-map.md` (2d), `docs/contracts/<entity>.md` (2b2), `docs/prd/01-rbac-matrix.md` (2e)
- **Skills**: non caricate all'avvio — solo quando invocate con `/nome-skill`
- **Session files**: temporanei, eliminati a fine blocco (Phase 8 step 0)
