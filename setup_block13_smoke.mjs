/**
 * Block 13 smoke test data setup.
 * Creates real content records (communication, event, opportunity, discount)
 * and seeds notifications pointing to those real IDs.
 * Run once before smoke test.
 */
import https from 'https';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '.env.local');
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

function rest(method, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const b = body ? JSON.stringify(body) : null;
    const url = new URL(SUPABASE_URL + '/rest/v1/' + path);
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...extraHeaders,
        ...(b ? { 'Content-Length': Buffer.byteLength(b) } : {}),
      },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (b) req.write(b);
    req.end();
  });
}

async function main() {
  console.log('Setting up Block 13 smoke test data...\n');

  // ── 1. Resolve collaboratore_test user_id ──────────────────────
  // collaboratore_test@test.com collab_id: 99f6c44c-... from MEMORY
  const { data: profiles } = await rest('GET', 'user_profiles?select=user_id&role=eq.collaboratore&is_active=eq.true');
  if (!profiles || profiles.length === 0) {
    console.error('No active collaboratori found'); process.exit(1);
  }
  // Use first 2 to seed notifications (covers both test accounts)
  const collabUserIds = profiles.slice(0, 2).map(p => p.user_id);
  console.log(`Found ${profiles.length} active collaboratori. Using first ${collabUserIds.length} for notification seed.`);

  // ── 2. Cleanup old smoke test content + notifications ──────────
  await rest('DELETE', 'communications?titolo=like.*[SMOKE]*');
  await rest('DELETE', 'events?titolo=like.*[SMOKE]*');
  await rest('DELETE', 'opportunities?titolo=like.*[SMOKE]*');
  await rest('DELETE', 'discounts?titolo=like.*[SMOKE]*');
  // Remove old test notifications
  for (const uid of collabUserIds) {
    await rest('DELETE', `notifications?tipo=in.(comunicazione_pubblicata,evento_pubblicato,opportunita_pubblicata,sconto_pubblicato)&user_id=eq.${uid}`);
  }
  console.log('Old smoke test data cleaned.\n');

  // ── 3. Create test content records ────────────────────────────
  const now = new Date();
  const dateStr = now.toLocaleDateString('it-IT');

  const { data: comm } = await rest('POST', 'communications', {
    titolo: '[SMOKE] Comunicazione di test Block 13',
    contenuto: 'Questo è un contenuto di test per verificare le notifiche del Block 13. Puoi ignorare questa comunicazione.',
    pinned: false,
    file_urls: [],
    published_at: now.toISOString(),
  });
  const commId = Array.isArray(comm) ? comm[0]?.id : comm?.id;
  console.log(`✓ Communication created: ${commId}`);

  const startDt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // +7 days
  const { data: evt } = await rest('POST', 'events', {
    titolo: '[SMOKE] Evento di test Block 13',
    descrizione: 'Evento creato per smoke test. Non è un evento reale.',
    start_datetime: startDt,
    location: 'Via Test 1, Milano',
    tipo: 'WEBINAR',
  });
  const evtId = Array.isArray(evt) ? evt[0]?.id : evt?.id;
  console.log(`✓ Event created: ${evtId}`);

  const { data: opp } = await rest('POST', 'opportunities', {
    titolo: '[SMOKE] Opportunità di test Block 13',
    tipo: 'LAVORO',
    descrizione: 'Opportunità creata per smoke test. Non è una posizione reale.',
  });
  const oppId = Array.isArray(opp) ? opp[0]?.id : opp?.id;
  console.log(`✓ Opportunity created: ${oppId}`);

  const { data: disc } = await rest('POST', 'discounts', {
    titolo: '[SMOKE] Sconto di test Block 13',
    descrizione: 'Sconto creato per smoke test.',
    fornitore: 'Test Fornitore S.r.l.',
    codice_sconto: 'SMOKE2026',
  });
  const discId = Array.isArray(disc) ? disc[0]?.id : disc?.id;
  console.log(`✓ Discount created: ${discId}`);

  if (!commId || !evtId || !oppId || !discId) {
    console.error('One or more content records failed to create. Aborting notification seed.');
    console.error({ commId, evtId, oppId, discId });
    process.exit(1);
  }

  // ── 4. Seed notifications for each collaboratore ───────────────
  const notifTemplate = (userId) => [
    { user_id: userId, tipo: 'comunicazione_pubblicata', titolo: 'Nuova comunicazione', messaggio: `[SMOKE] Nuova comunicazione: [SMOKE] Comunicazione di test Block 13`, entity_type: 'communication', entity_id: commId },
    { user_id: userId, tipo: 'evento_pubblicato',        titolo: 'Nuovo evento',        messaggio: `[SMOKE] Nuovo evento in programma: [SMOKE] Evento di test Block 13`,   entity_type: 'event',         entity_id: evtId  },
    { user_id: userId, tipo: 'opportunita_pubblicata',   titolo: 'Nuova opportunità',   messaggio: `[SMOKE] Nuova opportunità disponibile: [SMOKE] Opportunità di test Block 13`, entity_type: 'opportunity', entity_id: oppId },
    { user_id: userId, tipo: 'sconto_pubblicato',        titolo: 'Nuovo sconto',        messaggio: `[SMOKE] Nuovo sconto disponibile: [SMOKE] Sconto di test Block 13`,    entity_type: 'discount',      entity_id: discId },
  ];

  for (const uid of collabUserIds) {
    const { status } = await rest('POST', 'notifications', notifTemplate(uid));
    console.log(`✓ Seeded 4 notifications for user ${uid} — status ${status}`);
  }

  console.log('\n✅ Smoke test data ready.\n');
  console.log('Steps to verify (Phase 5.5):');
  console.log('');
  console.log('  Account: collaboratore_test@test.com');
  console.log('  1. Open notification bell → 4 unread: comunicazione, evento, opportunità, sconto');
  console.log('  2. Click comunicazione → /comunicazioni/' + commId);
  console.log('  3. Click evento       → /eventi/' + evtId);
  console.log('  4. Click opportunità  → /opportunita/' + oppId);
  console.log('  5. Click sconto       → /sconti/' + discId);
  console.log('');
  console.log('  Account: admin_test@test.com');
  console.log('  6. Impostazioni > Notifiche → Contenuti section visible (4 rows)');
  console.log('  7. Documenti section → "Documento firmato ricevuto" row for Amministrazione');
  console.log('  8. No "integrazioni" rows in Compensi or Rimborsi sections');
  console.log('  9. Create a new communication at /contenuti → collab_test bell shows new notification');
}

main().catch(console.error);
