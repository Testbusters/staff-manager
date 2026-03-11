/**
 * One-shot script: match Drive contract filenames to GSheet rows and write nome_pdf (col F).
 *
 * Usage: node scripts/match-contratti.mjs
 *
 * Requires .env.local with:
 *   GOOGLE_SERVICE_ACCOUNT_JSON
 *   CONTRATTI_SHEET_ID
 *   CONTRATTI_DRIVE_FOLDER_ID
 *
 * Logic:
 * 1. Build Drive folder map (filename → fileId)
 * 2. Read GSheet contratti!A:F (all rows)
 * 3. For each TO_PROCESS row with empty nome_pdf:
 *    - Build slug = (nome + cognome).toLowerCase().replace(/\s+/g, '_')
 *    - Find Drive file whose name includes that slug
 *    - If match: collect update
 * 4. Batch-write nome_pdf (col F) for matched rows
 * 5. Log matched / unmatched summary
 */

import { readFileSync } from 'fs';
import { webcrypto } from 'crypto';

// ── Load .env.local ───────────────────────────────────────────────────────────

const envPath = new URL('../.env.local', import.meta.url).pathname;
const envContent = readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
  if (!process.env[key]) process.env[key] = val;
}

// ── JWT helpers ───────────────────────────────────────────────────────────────

function pemToDer(pem) {
  const b64 = pem.replace(/-----[^\n]+-----|[\r\n]/g, '');
  return Buffer.from(b64, 'base64');
}

async function getToken(scope) {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');

  const { client_email, private_key: rawKey } = JSON.parse(raw);
  let pk = rawKey;
  while (pk.includes('\\n')) pk = pk.replace(/\\n/g, '\n');
  pk = pk.replace(/\r/g, '');

  const now     = Math.floor(Date.now() / 1000);
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: client_email, scope,
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  })).toString('base64url');

  const si  = `${header}.${payload}`;
  const key = await webcrypto.subtle.importKey('pkcs8', pemToDer(pk),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', key, Buffer.from(si));
  const assertion = `${si}.${Buffer.from(sig).toString('base64url')}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const { access_token, error } = await res.json();
  if (!access_token) throw new Error(`Google token error: ${error}`);
  return access_token;
}

// ── Drive folder map ──────────────────────────────────────────────────────────

async function buildFolderMap(folderId) {
  const token = await getToken('https://www.googleapis.com/auth/drive.readonly');
  const map   = new Map(); // filename → fileId
  let pageToken;

  do {
    const params = new URLSearchParams({
      q:                         `'${folderId}' in parents and trashed = false`,
      fields:                    'nextPageToken,files(id,name)',
      pageSize:                  '1000',
      supportsAllDrives:         'true',
      includeItemsFromAllDrives: 'true',
      corpora:                   'allDrives',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res  = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();

    if (data.error) throw new Error(`Drive API error: ${data.error.message}`);
    (data.files ?? []).forEach(f => map.set(f.name, f.id));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return map;
}

// ── GSheet read/write ─────────────────────────────────────────────────────────

async function readSheet(sheetId, range) {
  const token = await getToken('https://www.googleapis.com/auth/spreadsheets');
  const enc   = encodeURIComponent(range);
  const res   = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${enc}`,
    { headers: { Authorization: `Bearer ${token}` } });
  const data  = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.values ?? [];
}

async function batchUpdateSheet(sheetId, updates) {
  if (updates.length === 0) return;
  const token = await getToken('https://www.googleapis.com/auth/spreadsheets');
  const res   = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`,
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ valueInputOption: 'RAW', data: updates }),
    },
  );
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
}

// ── Main ──────────────────────────────────────────────────────────────────────

const SHEET_ID   = process.env.CONTRATTI_SHEET_ID;
const FOLDER_ID  = process.env.CONTRATTI_DRIVE_FOLDER_ID;
const TAB        = 'contratti';

if (!SHEET_ID)  { console.error('CONTRATTI_SHEET_ID not set'); process.exit(1); }
if (!FOLDER_ID) { console.error('CONTRATTI_DRIVE_FOLDER_ID not set'); process.exit(1); }

console.log('Building Drive folder map…');
const folderMap = await buildFolderMap(FOLDER_ID);
console.log(`  → ${folderMap.size} files in Drive folder`);

// Build a search index: for each Drive filename, extract a normalized "name segment"
// Strip prefix: contratto(tb|p4m)YYYY_   suffix: _firmato_\d{14}.pdf
const PREFIX_RE = /^contratto(?:tb|p4m)\d{4}_/i;
const SUFFIX_RE = /_firmato_\d{14}\.pdf$/i;

const driveIndex = new Map(); // normalized_slug → original filename
for (const filename of folderMap.keys()) {
  const stripped  = filename.replace(PREFIX_RE, '').replace(SUFFIX_RE, '');
  const normalized = stripped.toLowerCase().replace(/\s+/g, '_');
  // Store only if no collision (first wins)
  if (!driveIndex.has(normalized)) driveIndex.set(normalized, filename);
}
console.log(`  → ${driveIndex.size} unique slugs indexed`);

console.log('Reading GSheet…');
const allValues = await readSheet(SHEET_ID, `${TAB}!A:F`);
// Skip header row (row 0)
const dataRows  = allValues.slice(1).map((row, i) => ({
  rowIndex: i + 2,
  nome:     row[0] ?? '',
  cognome:  row[1] ?? '',
  stato:    row[4] ?? '',
  nome_pdf: row[5] ?? '',
}));

const candidates = dataRows.filter(r =>
  r.stato.trim().toUpperCase() !== 'PROCESSED' && !r.nome_pdf.trim()
);
console.log(`  → ${candidates.length} rows without nome_pdf to process`);

const updates  = [];
const matched  = [];
const unmatched = [];

for (const r of candidates) {
  const slug = `${r.nome.trim()}_${r.cognome.trim()}`.toLowerCase().replace(/\s+/g, '_');
  const filename = driveIndex.get(slug);

  if (filename) {
    updates.push({ range: `${TAB}!F${r.rowIndex}`, values: [[filename]] });
    matched.push({ row: r.rowIndex, slug, filename });
  } else {
    unmatched.push({ row: r.rowIndex, slug });
  }
}

console.log(`\nMatched: ${matched.length} / ${candidates.length}`);
if (matched.length > 0) {
  console.log('\nMatched rows:');
  matched.forEach(m => console.log(`  Riga ${m.row}: ${m.slug} → ${m.filename}`));
}
if (unmatched.length > 0) {
  console.log('\nUnmatched rows:');
  unmatched.forEach(m => console.log(`  Riga ${m.row}: ${m.slug} (no match in Drive)`));
}

if (updates.length > 0) {
  console.log('\nWriting nome_pdf to sheet…');
  await batchUpdateSheet(SHEET_ID, updates);
  console.log(`  → ${updates.length} rows updated.`);
} else {
  console.log('\nNo updates to write.');
}
