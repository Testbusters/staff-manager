// Phase 5.4 — Block 11: test data for collaboratore_test@test.com
// Ensures the dashboard has realistic data for every new UI state.
import https from 'https';
import fs from 'fs';

const env = fs.readFileSync('./.env.local', 'utf8');
const serviceKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();
if (!serviceKey) { console.error('No service key'); process.exit(1); }

async function req(method, path, body) {
  return new Promise((resolve) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const opts = {
      hostname: 'nyajqcjqmgxctlqighql.supabase.co',
      path,
      method,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };
    const r = https.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    r.on('error', (e) => resolve({ status: 0, body: String(e) }));
    if (bodyStr) r.write(bodyStr);
    r.end();
  });
}

// Lookup smoke test collaborator
const collabRes = await req('GET', '/rest/v1/collaborators?username=eq.collaboratore_test_2&select=id,user_id,nome', null);
const collabs = JSON.parse(collabRes.body);
const collab = collabs[0];
if (!collab) { console.error('Collaboratore not found'); process.exit(1); }
const { id: collabId, user_id: userId, nome } = collab;
console.log(`Collab: ${nome} (${collabId})`);

// Look up community
const commRes = await req('GET', '/rest/v1/communities?name=like.Testbusters*&select=id,name', null);
const comms = JSON.parse(commRes.body);
const commId = comms[0]?.id;
console.log('Community:', comms[0]?.name, commId);

// 1. Ensure collaborator has nome set
await req('PATCH', `/rest/v1/collaborators?id=eq.${collabId}`, { nome: 'Luca' });

// 2. Cleanup previous UAT compensations/expenses
await req('DELETE', `/rest/v1/compensations?collaborator_id=eq.${collabId}&descrizione=like.UAT%25`, null);
await req('DELETE', `/rest/v1/expense_reimbursements?collaborator_id=eq.${collabId}&descrizione=like.UAT%25`, null);

// 3. Insert compensations
const now = new Date();
const sixMonthsAgo = (offset) => {
  const d = new Date(now.getFullYear(), now.getMonth() - offset, 15);
  return d.toISOString();
};

// LIQUIDATO 3 months ago (for bar chart)
const c1 = await req('POST', '/rest/v1/compensations', {
  collaborator_id: collabId,
  community_id: commId,
  descrizione: 'UAT Compenso liquidato mese -3',
  importo_lordo: 500,
  importo_netto: 400,
  stato: 'LIQUIDATO',
  liquidated_at: sixMonthsAgo(3),
  created_at: sixMonthsAgo(3),
  updated_at: sixMonthsAgo(3),
});
console.log('Comp LIQUIDATO:', c1.status);

// APPROVATO (for "Da ricevere")
const c2 = await req('POST', '/rest/v1/compensations', {
  collaborator_id: collabId,
  community_id: commId,
  descrizione: 'UAT Compenso approvato',
  importo_lordo: 300,
  importo_netto: 240,
  stato: 'APPROVATO',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});
console.log('Comp APPROVATO:', c2.status);

// IN_ATTESA (for "Compensi in corso")
const c3 = await req('POST', '/rest/v1/compensations', {
  collaborator_id: collabId,
  community_id: commId,
  descrizione: 'UAT Compenso in attesa',
  importo_lordo: 200,
  importo_netto: 160,
  stato: 'IN_ATTESA',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});
console.log('Comp IN_ATTESA:', c3.status);

// 4. Insert rimborso LIQUIDATO 1 month ago (for bar chart)
const e1 = await req('POST', '/rest/v1/expense_reimbursements', {
  collaborator_id: collabId,
  categoria: 'Trasporti',
  data_spesa: sixMonthsAgo(1).split('T')[0],
  importo: 28,
  descrizione: 'UAT Rimborso liquidato mese -1',
  stato: 'LIQUIDATO',
  liquidated_at: sixMonthsAgo(1),
  created_at: sixMonthsAgo(1),
  updated_at: sixMonthsAgo(1),
});
console.log('Exp LIQUIDATO:', e1.status);

console.log('\n✅ Test data ready');
console.log('Account: collaboratore_test@test.com / Testbusters123');
console.log('Expected dashboard: nome "Luca", 4 KPI cards with data, bar chart visible, azioni rapide 4 buttons');
