#!/bin/bash
# test-coverage-guard.sh - PreToolUse hook
# Blocks Edit/Write on files outside the test-coverage block perimeter.
# Bypass (one-off): export TEST_COVERAGE_GUARD_OFF=1

if [ "${TEST_COVERAGE_GUARD_OFF:-0}" = "1" ]; then
  exit 0
fi

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [ -z "$FILE" ] || [ "$FILE" = "null" ]; then
  exit 0
fi

case "$FILE" in
  */__tests__/*) exit 0 ;;
  */e2e/*) exit 0 ;;
  */vitest.config.ts) exit 0 ;;
  */playwright.config.ts) exit 0 ;;
  */coverage/*) exit 0 ;;
  */.claude/session/*) exit 0 ;;
  */.claude/hooks/test-coverage-guard.sh) exit 0 ;;
  */.claude/settings.local.json) exit 0 ;;
  */docs/implementation-checklist.md) exit 0 ;;
  */docs/refactoring-backlog.md) exit 0 ;;
esac

cat >&2 <<EOF
test-coverage-guard: blocked write outside perimeter
File: $FILE

Allowed perimeter during test-coverage block:
  - **/__tests__/**
  - **/e2e/**
  - vitest.config.ts / playwright.config.ts
  - .claude/session/block-test-coverage.md
  - coverage/**
  - docs/implementation-checklist.md (Phase 8)
  - docs/refactoring-backlog.md (discoveries)

If this edit is a legitimate cross-file refactor discovered during coverage work,
escalate to the user before proceeding. Bypass (one-off): export TEST_COVERAGE_GUARD_OFF=1
EOF
exit 2
