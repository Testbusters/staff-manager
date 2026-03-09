/**
 * Script 0 — Extract collaboratori from WordPress and write to import sheet
 *
 * Fetches all users with role=collaboratore_tb from WordPress REST API,
 * maps them to (nome, cognome, email, username, stato=TO_PROCESS) and
 * appends them to the import sheet (skipping rows that already exist by email).
 *
 * Usage:
 *   node scripts/extract-wp-to-sheet.mjs
 *
 * Env vars required (from .env.local):
 *   GOOGLE_SERVICE_ACCOUNT_JSON
 *
 * WP credentials are hardcoded for this one-off migration script.
 */

import { webcrypto } from 'crypto';
import * as dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env.local') });

const WP_BASE   = 'https://staff.testbusters.it/wp-json/wp/v2';
const WP_USER   = 'marco.guillermaz@testbusters.it';
const WP_PASS   = '0pkf YR1S ZReS VOOz dT05 y7zo';
const WP_AUTH   = 'Basic ' + Buffer.from(`${WP_USER}:${WP_PASS}`).toString('base64');

const SHEET_ID  = '1NeVxbfQAl0z4OPAyihHISUfF7Edj1aNZ9tCwwXgMBz0';
const TAB       = 'import_collaboratori';

// ── Google Sheets auth ────────────────────────────────────────────────────────

function pemToDer(pem) {
  return Buffer.from(pem.replace(/-----[^\n]+-----|[\r\n]/g, ''), 'base64');
}

async function getGoogleToken() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');
  let { client_email, private_key } = JSON.parse(raw);
  while (private_key.includes('\\n')) private_key = private_key.replace(/\\n/g, '\n');
  private_key = private_key.replace(/\r/g, '');

  const now = Math.floor(Date.now() / 1000);
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: client_email, scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  })).toString('base64url');
  const si = `${header}.${payload}`;
  const key = await webcrypto.subtle.importKey('pkcs8', pemToDer(private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', key, Buffer.from(si));
  const assertion = `${si}.${Buffer.from(sig).toString('base64url')}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error('Google token failed: ' + JSON.stringify(j));
  return j.access_token;
}

async function sheetsGet(token, range) {
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const j = await r.json();
  if (j.error) throw new Error('Sheets GET: ' + JSON.stringify(j.error));
  return j.values ?? [];
}

async function sheetsAppend(token, range, values) {
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    },
  );
  const j = await r.json();
  if (j.error) throw new Error('Sheets append: ' + JSON.stringify(j.error));
  return j;
}

// ── WordPress fetch (all pages) ───────────────────────────────────────────────

async function fetchAllWpCollaboratori() {
  const users = [];
  let page = 1;
  while (true) {
    const url = `${WP_BASE}/users?per_page=100&context=edit&roles=collaboratore_tb&page=${page}`;
    const res = await fetch(url, { headers: { Authorization: WP_AUTH } });
    if (!res.ok) throw new Error(`WP API error ${res.status}: ${await res.text()}`);

    const total = parseInt(res.headers.get('x-wp-totalpages') ?? '1', 10);
    const data  = await res.json();
    users.push(...data);

    process.stdout.write(`\r  Fetched page ${page}/${total} (${users.length} users so far)…`);
    if (page >= total) break;
    page++;
  }
  console.log();
  return users;
}

// ── Name splitting ────────────────────────────────────────────────────────────

function splitName(displayName) {
  const parts = (displayName ?? '').trim().split(/\s+/);
  if (parts.length === 0 || (parts.length === 1 && !parts[0])) return { nome: '', cognome: '' };
  if (parts.length === 1) return { nome: parts[0], cognome: parts[0] };
  const cognome = parts.pop();
  return { nome: parts.join(' '), cognome };
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('Authenticating with Google Sheets…');
const gToken = await getGoogleToken();

console.log('Reading existing sheet rows to detect duplicates…');
const existing = await sheetsGet(gToken, `${TAB}!A:F`);
// Col C (index 2) = email
const existingEmails = new Set(
  existing.slice(1).map(r => (r[2] ?? '').trim().toLowerCase()).filter(Boolean),
);
console.log(`  ${existingEmails.size} emails already in sheet`);

console.log('\nFetching WordPress collaboratori…');
const wpUsers = await fetchAllWpCollaboratori();
console.log(`  Total fetched: ${wpUsers.length}`);

// Map WP users → sheet rows
const rows = [];
let skippedCount = 0;
for (const u of wpUsers) {
  const email    = (u.email ?? '').trim().toLowerCase();
  const username = (u.username ?? '').trim().toLowerCase();
  const { nome, cognome } = splitName(u.name);

  if (!email || !username || !nome) {
    console.warn(`  Skipping WP id=${u.id}: missing data (email="${email}" username="${username}" name="${u.name}")`);
    skippedCount++;
    continue;
  }

  if (existingEmails.has(email)) {
    skippedCount++;
    continue;
  }

  rows.push([nome, cognome, email, username, 'TO_PROCESS', '']);
  existingEmails.add(email); // prevent intra-batch dupes
}

console.log(`\n  ${rows.length} new rows to write, ${skippedCount} skipped (already in sheet or missing data)`);

if (rows.length === 0) {
  console.log('Nothing to write.');
  process.exit(0);
}

console.log(`\nWriting ${rows.length} rows to sheet…`);
// Write in batches of 200 to avoid payload limits
const BATCH = 200;
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  await sheetsAppend(gToken, `${TAB}!A:F`, batch);
  console.log(`  Written rows ${i + 1}–${Math.min(i + BATCH, rows.length)}`);
}

console.log(`\nDone. ${rows.length} collaboratori written to sheet.`);
console.log(`Next step: node scripts/validate-collaboratori.mjs`);
