# Block: Onboarding Contract Fix

## Status: IN PROGRESS

## Scope
Fix 3 bugs in the onboarding wizard + contract generation flow, normalize Federico Nolli, create test invite for marco.guillermaz@gmail.com.

## Bugs to fix
1. **Bug #1 Critical** — `OnboardingWizard.tsx:119-122`: when `download_url` is null after API call, `router.push('/')` fires silently. Fix: show a "account configurato" confirmation state instead.
2. **Bug #2 Minor** — `OnboardingWizard.tsx:129`: download filename uses `.docx` extension on a PDF. Fix: → `.pdf`
3. **Bug #3 Copy** — `OnboardingWizard.tsx:179`: message says "caricalo nella sezione Documenti" (upload) but signing is digital in-platform. Fix: update copy.

## Files to change
- `components/onboarding/OnboardingWizard.tsx` — all 3 bugs

## Remediation
- federico_nolli: `onboarding_completed=true`, `tipo_contratto=OCCASIONALE`, zero documents. Generate contract via Node.js script.

## Test invite
- marco.guillermaz@gmail.com, Community Testbusters, tipo_contratto=OCCASIONALE, role=collaboratore
