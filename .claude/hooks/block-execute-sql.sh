#!/bin/zsh
INPUT=$(cat)
PROJECT=$(echo "$INPUT" | jq -r '.tool_input.params.project_id // .tool_input.project_id // empty' 2>/dev/null)
if [ "$PROJECT" = 'nyajqcjqmgxctlqighql' ]; then
  printf '\n[BLOCCO HARD] execute_sql → database di produzione\n\nPerché:\n  • project_id nyajqcjqmgxctlqighql = produzione\n  • execute_sql durante sviluppo DEVE usare staging (gjwkvgfwkdwzqlvudgqr)\n  • Produzione: solo Phase 8 step 7, mai durante Phase 2\n\nImpatto:\n  • Migrazione su prod durante sviluppo = rollback manuale\n  • Possibile data loss su dati reali\n  • Deploy di produzione potenzialmente rotto\n\nProcedura corretta:\n  1. Usa project_id: gjwkvgfwkdwzqlvudgqr (staging)\n  2. Verifica la query su staging\n  3. Phase 8 step 7: applica a produzione prima di sm-deploy\n\nNessun bypass disponibile — hard rule di pipeline.\n' >&2
  exit 2
fi
