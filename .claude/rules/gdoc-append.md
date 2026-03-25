# GDoc Changelog Append — Reference Script

Run from project root after updating `docs/prd/prd.md`. Appends a Changelog entry to the GDoc presentation layer.

**GDoc ID**: `1OtOQO8-6pjjaq2CrOaBh7ntT-nZ4haV_yvxCBZpL46o`
**Section**: "VII — Changelog"
**Format**: `DATE  |  vX.Y  |  Block Name: one-line summary.`

```bash
cd ~/Projects/staff-manager && node -e "
require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');
const svc = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
const auth = new google.auth.GoogleAuth({ credentials: svc, scopes: ['https://www.googleapis.com/auth/documents'] });
const docs = google.docs({ version: 'v1', auth });
const DOC_ID = '1OtOQO8-6pjjaq2CrOaBh7ntT-nZ4haV_yvxCBZpL46o';
const text = '\nDATE  |  vX.Y  |  Block Name: one-line summary.\n';
(async () => {
  const doc = await docs.documents.get({ documentId: DOC_ID });
  const endIndex = doc.data.body.content.at(-1).endIndex - 1;
  await docs.documents.batchUpdate({ documentId: DOC_ID, requestBody: { requests: [{ insertText: { location: { index: endIndex }, text } }] } });
  console.log('GDoc changelog appended');
})().catch(e => { console.error(e.message); process.exit(1); });
"
```

**Notes**:
- `require('dotenv').config` is mandatory — `GOOGLE_SERVICE_ACCOUNT_JSON` is not in shell env.
- Do NOT rewrite the whole document — append only.
- If no PRD section is affected by the block (pure internal refactor with zero functional change): skip GDoc append, but still verify `docs/prd/prd.md` is current.
