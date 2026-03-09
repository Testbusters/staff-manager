/**
 * Script 2 — Import collaborators from sheet to Supabase
 *
 * Processes all rows with stato = TO_PROCESS:
 *   1. Create auth user (email_confirm=true, must_change_password=true)
 *   2. Insert user_profiles (role=collaboratore, onboarding_completed=false)
 *   3. Insert collaborators record (nome, cognome, email, username, tipo_contratto=OCCASIONALE)
 *   4. Write stato=IMPORTED + generated password to sheet (cols E + G)
 *   On partial failure: rollback auth user, write stato=ERROR + message (cols E + F)
 *
 * Idempotent: rows with stato=IMPORTED are skipped.
 *
 * Usage:
 *   node scripts/import-collaboratori.mjs [--dry-run]
 *
 * --dry-run: validates rows and prints actions without writing to DB or sheet.
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

const DRY_RUN   = process.argv.includes('--dry-run');
const SHEET_ID  = '1NeVxbfQAl0z4OPAyihHISUfF7Edj1aNZ9tCwwXgMBz0';
const TAB       = 'import_collaboratori';
const STATO_COL = 'E';
const NOTE_COL  = 'F';
const PWD_COL   = 'G';  // password_temp

if (DRY_RUN) console.log('⚠️  DRY RUN — no DB writes, no sheet writes\n');

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
  if (updates.length === 0 || DRY_RUN) return;
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

// ── Password generator ────────────────────────────────────────────────────────

function generatePassword() {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower   = 'abcdefghjkmnpqrstuvwxyz';
  const digits  = '23456789';
  const special = '!@#$%';
  const rand    = (s) => s[Math.floor(Math.random() * s.length)];
  const chars   = [
    rand(upper), rand(upper),
    rand(lower), rand(lower), rand(lower),
    rand(digits), rand(digits),
    rand(special),
    rand(upper), rand(lower),
  ];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

// ── Supabase service role ─────────────────────────────────────────────────────

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ── Import a single row ───────────────────────────────────────────────────────

async function importRow(nome, cognome, email, username) {
  const password = generatePassword();

  // 1. Create auth user
  const { data: authData, error: authErr } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authErr || !authData.user) {
    throw new Error('createUser: ' + (authErr?.message ?? 'no user returned'));
  }
  const userId = authData.user.id;

  // 2. Insert user_profiles
  const { error: profileErr } = await svc.from('user_profiles').insert({
    user_id:              userId,
    role:                 'collaboratore',
    is_active:            true,
    must_change_password: true,
    onboarding_completed: false,
  });
  if (profileErr) {
    await svc.auth.admin.deleteUser(userId).catch(() => {});
    throw new Error('user_profiles insert: ' + profileErr.message);
  }

  // 3. Insert collaborators
  const { error: collabErr } = await svc.from('collaborators').insert({
    user_id:        userId,
    email,
    nome,
    cognome,
    username,
    tipo_contratto: 'OCCASIONALE',
  });
  if (collabErr) {
    await svc.auth.admin.deleteUser(userId).catch(() => {});
    throw new Error('collaborators insert: ' + collabErr.message);
  }

  return { userId, password };
}

// ── Main ──────────────────────────────────────────────────────────────────────

const gToken = await getGoogleToken();
const rows   = await sheetsGet(gToken, `${TAB}!A:F`);

if (rows.length < 2) {
  console.log('No data rows found (only header or empty sheet).');
  process.exit(0);
}

let importedCount = 0;
let skippedCount  = 0;
let errorCount    = 0;
const updates     = [];

for (let i = 1; i < rows.length; i++) {
  const row      = rows[i];
  const rowNum   = i + 1;
  const nome     = (row[0] ?? '').trim();
  const cognome  = (row[1] ?? '').trim();
  const email    = (row[2] ?? '').trim().toLowerCase();
  const username = (row[3] ?? '').trim().toLowerCase();
  const stato    = (row[4] ?? '').trim();

  // Skip non TO_PROCESS rows
  if (stato === 'IMPORTED') {
    console.log(`Row ${rowNum}: skipped (already IMPORTED)`);
    skippedCount++;
    continue;
  }
  if (stato !== 'TO_PROCESS' && stato !== '') {
    console.log(`Row ${rowNum}: skipped (stato="${stato}" — run validate first)`);
    skippedCount++;
    continue;
  }

  // Basic guard: refuse to import clearly invalid rows
  if (!nome || !cognome || !email || !username) {
    errorCount++;
    const msg = 'Campi obbligatori mancanti — eseguire validate prima di import';
    console.log(`Row ${rowNum} ERROR: ${msg}`);
    updates.push(
      { range: `${TAB}!${STATO_COL}${rowNum}`, values: [['ERROR']] },
      { range: `${TAB}!${NOTE_COL}${rowNum}`,  values: [[msg]] },
      { range: `${TAB}!${PWD_COL}${rowNum}`,   values: [['']] },
    );
    continue;
  }

  if (DRY_RUN) {
    console.log(`Row ${rowNum} [DRY RUN]: would import ${nome} ${cognome} <${email}> @${username}`);
    importedCount++;
    continue;
  }

  try {
    const { userId, password } = await importRow(nome, cognome, email, username);
    importedCount++;
    console.log(`Row ${rowNum} IMPORTED: ${nome} ${cognome} <${email}> @${username} (uid=${userId})`);
    updates.push(
      { range: `${TAB}!${STATO_COL}${rowNum}`, values: [['IMPORTED']] },
      { range: `${TAB}!${NOTE_COL}${rowNum}`,  values: [['']] },
      { range: `${TAB}!${PWD_COL}${rowNum}`,   values: [[password]] },
    );
  } catch (err) {
    errorCount++;
    const msg = err.message;
    console.error(`Row ${rowNum} ERROR: ${msg}`);
    updates.push(
      { range: `${TAB}!${STATO_COL}${rowNum}`, values: [['ERROR']] },
      { range: `${TAB}!${NOTE_COL}${rowNum}`,  values: [[msg]] },
      { range: `${TAB}!${PWD_COL}${rowNum}`,   values: [['']] },
    );
  }
}

if (updates.length > 0) {
  console.log('\nWriting results to sheet…');
  await sheetsBatchUpdate(gToken, updates);
}

console.log(`\nImport complete: ${importedCount} imported, ${skippedCount} skipped, ${errorCount} errors.`);
if (errorCount > 0) {
  console.log('Check ERROR rows in the sheet for details.');
}
