/**
 * Script 1 — Validate import sheet
 *
 * Reads all rows from the import sheet and validates each one:
 *   - nome, cognome: non-empty
 *   - email: valid format + not already in auth.users
 *   - username: format [a-z0-9_] 3–50 chars + not already in collaborators
 *
 * Writes result to column E (stato) and F (note_errore). No DB writes.
 *
 * Usage:
 *   node scripts/validate-collaboratori.mjs
 *
 * Env vars required (from .env.local):
 *   GOOGLE_SERVICE_ACCOUNT_JSON
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { webcrypto } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env.local') });

const SHEET_ID  = '1NeVxbfQAl0z4OPAyihHISUfF7Edj1aNZ9tCwwXgMBz0';
const TAB       = 'import_collaboratori';
const STATO_COL = 'E';
const NOTE_COL  = 'F';
const FIRST_DATA_ROW = 2;

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
  if (!j.access_token) throw new Error('Token failed: ' + JSON.stringify(j));
  return j.access_token;
}

async function sheetsGet(token, range) {
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const j = await r.json();
  if (j.error) throw new Error('Sheets GET error: ' + JSON.stringify(j.error));
  return j.values ?? [];
}

async function sheetsBatchUpdate(token, updates) {
  if (updates.length === 0) return;
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchUpdate`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ valueInputOption: 'RAW', data: updates }),
    },
  );
  const j = await r.json();
  if (j.error) throw new Error('Sheets batchUpdate error: ' + JSON.stringify(j.error));
}

// ── Supabase service role ─────────────────────────────────────────────────────

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ── Validation helpers ────────────────────────────────────────────────────────

const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9_]{3,50}$/;

async function loadExistingEmails() {
  // Load all existing auth users (paginated, up to 10k)
  const emails = new Set();
  let page = 1;
  while (true) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error('listUsers failed: ' + error.message);
    data.users.forEach(u => emails.add((u.email ?? '').toLowerCase()));
    if (data.users.length < 1000) break;
    page++;
  }
  return emails;
}

async function loadExistingUsernames() {
  const { data, error } = await svc.from('collaborators').select('username').not('username', 'is', null);
  if (error) throw new Error('loadUsernames failed: ' + error.message);
  return new Set(data.map(r => r.username.toLowerCase()));
}

// ── Main ──────────────────────────────────────────────────────────────────────

const gToken = await getGoogleToken();
const rows   = await sheetsGet(gToken, `${TAB}!A:F`);

if (rows.length < 2) {
  console.log('No data rows found (only header or empty sheet).');
  process.exit(0);
}

console.log(`Loading existing emails and usernames from DB…`);
const existingEmails    = await loadExistingEmails();
const existingUsernames = await loadExistingUsernames();
console.log(`  ${existingEmails.size} existing emails, ${existingUsernames.size} existing usernames`);

const updates  = [];
let validCount = 0;
let errorCount = 0;

// Track sheet-level duplicates within this import batch
const batchEmails    = new Set();
const batchUsernames = new Set();

for (let i = 1; i < rows.length; i++) {
  const row      = rows[i];
  const rowNum   = i + 1; // 1-based sheet row
  const nome     = (row[0] ?? '').trim();
  const cognome  = (row[1] ?? '').trim();
  const email    = (row[2] ?? '').trim().toLowerCase();
  const username = (row[3] ?? '').trim().toLowerCase();
  const stato    = (row[4] ?? '').trim();

  // Skip already-processed rows
  if (stato === 'IMPORTED') {
    console.log(`Row ${rowNum}: skipped (already IMPORTED)`);
    continue;
  }

  const errors = [];

  if (!nome)    errors.push('nome mancante');
  if (!cognome) errors.push('cognome mancante');

  if (!email) {
    errors.push('email mancante');
  } else if (!EMAIL_RE.test(email)) {
    errors.push('email non valida');
  } else if (existingEmails.has(email)) {
    errors.push('email già in uso');
  } else if (batchEmails.has(email)) {
    errors.push('email duplicata nel foglio');
  }

  if (!username) {
    errors.push('username mancante');
  } else if (!USERNAME_RE.test(username)) {
    errors.push('username non valido (solo a-z, 0-9, _, 3-50 char)');
  } else if (existingUsernames.has(username)) {
    errors.push('username già in uso');
  } else if (batchUsernames.has(username)) {
    errors.push('username duplicato nel foglio');
  }

  if (errors.length > 0) {
    errorCount++;
    console.log(`Row ${rowNum} ERROR: ${errors.join('; ')}`);
    updates.push(
      { range: `${TAB}!${STATO_COL}${rowNum}`, values: [['ERROR']] },
      { range: `${TAB}!${NOTE_COL}${rowNum}`,  values: [[errors.join('; ')]] },
    );
  } else {
    validCount++;
    batchEmails.add(email);
    batchUsernames.add(username);
    console.log(`Row ${rowNum} VALID: ${nome} ${cognome} <${email}> @${username}`);
    updates.push(
      { range: `${TAB}!${STATO_COL}${rowNum}`, values: [['TO_PROCESS']] },
      { range: `${TAB}!${NOTE_COL}${rowNum}`,  values: [['']] },
    );
  }
}

if (updates.length > 0) {
  console.log('\nWriting results to sheet…');
  await sheetsBatchUpdate(gToken, updates);
}

console.log(`\nValidation complete: ${validCount} valid, ${errorCount} errors.`);
if (errorCount > 0) {
  console.log('Fix the ERROR rows in the sheet, then re-run validate before importing.');
}
