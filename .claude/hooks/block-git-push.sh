#!/bin/zsh
INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
if echo "$CMD" | grep -qE 'git push.*(origin main|origin staging)'; then
  printf '\n[BLOCCO HARD] git push → origin main / origin staging\n\nPerché:\n  • Push diretto a main o staging vietato dalla branch discipline\n  • main e staging sono branch protetti — nessun commit diretto\n\nImpatto:\n  • Staging: Vercel preview corrotto con commit non testati\n  • Main: produzione compromessa senza smoke test\n  • Nessun rollback automatico disponibile\n\nProcedura corretta:\n  • Blocco funzionale / Fast Lane:\n    git -C ~/Projects/staff-manager checkout staging\n    git merge <branch> --no-ff\n    git -C ~/Projects/staff-manager push origin staging\n  • Produzione: sm-deploy da iTerm dopo staging verificato\n\nNessun bypass disponibile — hard rule di pipeline.\n' >&2
  exit 2
fi
