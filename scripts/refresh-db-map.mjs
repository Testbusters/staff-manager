#!/usr/bin/env node
/**
 * scripts/refresh-db-map.mjs
 *
 * Refreshes the "## Column specs" section in docs/db-map.md
 * by querying information_schema on the staging Supabase DB.
 *
 * Usage: node scripts/refresh-db-map.mjs
 * Requires: SUPABASE_ACCESS_TOKEN in .env.local
 *
 * Run after every migration block that adds/modifies tables or columns.
 * Staging DB: gjwkvgfwkdwzqlvudgqr
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DB_MAP_PATH = resolve(ROOT, 'docs/db-map.md');
const STAGING_PROJECT_ID = 'gjwkvgfwkdwzqlvudgqr';

function readEnv() {
  const envPath = resolve(ROOT, '.env.local');
  const content = readFileSync(envPath, 'utf-8');
  const vars = {};
  for (const line of content.split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (match) vars[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return vars;
}

function executeSQL(pat, projectId, query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query });
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${projectId}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const COLUMNS_QUERY = `
SELECT
  c.table_name,
  c.column_name,
  CASE
    WHEN c.data_type = 'ARRAY' THEN LTRIM(c.udt_name, '_') || '[]'
    WHEN c.data_type = 'USER-DEFINED' THEN c.udt_name
    ELSE c.data_type
  END AS data_type,
  c.is_nullable,
  c.column_default,
  c.ordinal_position
FROM information_schema.columns c
WHERE c.table_schema = 'public'
ORDER BY c.table_name, c.ordinal_position;
`;

const FK_QUERY = `
SELECT
  t.relname AS table_name,
  a.attname AS column_name,
  fn.nspname || '.' || ft.relname AS foreign_table,
  fa.attname AS foreign_column
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
JOIN pg_class ft ON ft.oid = c.confrelid
JOIN pg_namespace fn ON fn.oid = ft.relnamespace
JOIN pg_attribute fa ON fa.attrelid = c.confrelid AND fa.attnum = ANY(c.confkey)
WHERE c.contype = 'f'
  AND n.nspname = 'public'
  AND array_length(c.conkey, 1) = 1
ORDER BY table_name, column_name;
`;

// Canonical table order matching db-map.md sections
const TABLE_ORDER = [
  // Core identity
  'user_profiles', 'collaborators', 'communities', 'collaborator_communities', 'user_community_access',
  // Compensations
  'compensations', 'compensation_history', 'compensation_attachments', 'compensation_competenze',
  // Expense Reimbursements
  'expense_reimbursements', 'expense_history', 'expense_attachments',
  // Documents
  'documents', 'contract_templates',
  // Tickets
  'tickets', 'ticket_messages',
  // Content
  'communications', 'events', 'opportunities', 'resources', 'discounts',
  // Notifications & Email
  'notifications', 'notification_settings', 'email_templates', 'email_layout_config', 'email_events',
  // Operations & Monitoring
  'export_runs', 'import_runs', 'feedback', 'app_errors',
];

function formatDefault(val) {
  if (!val) return '—';
  // Remove schema-qualified casts like ::text, ::character varying
  let v = val.replace(/::[\w\s]+/g, '');
  if (v.length > 45) v = v.slice(0, 42) + '...';
  return `\`${v}\``;
}

function formatFK(fk) {
  if (!fk) return '—';
  // Strip 'public.' prefix for cleaner display
  return `→ ${fk.foreign_table.replace('public.', '')}.${fk.foreign_column}`;
}

function generateColumnSpecs(columns, fkMap) {
  const today = new Date().toISOString().slice(0, 10);

  // Group columns by table
  const tableMap = new Map();
  for (const col of columns) {
    if (!tableMap.has(col.table_name)) tableMap.set(col.table_name, []);
    tableMap.get(col.table_name).push(col);
  }

  const orderedTables = [
    ...TABLE_ORDER.filter(t => tableMap.has(t)),
    ...[...tableMap.keys()].filter(t => !TABLE_ORDER.includes(t)).sort(),
  ];

  let md = `## Column specs\n\n`;
  md += `> Auto-generated from \`information_schema\` on staging DB (\`${STAGING_PROJECT_ID}\`).\n`;
  md += `> Last refreshed: ${today}.\n`;
  md += `> Run \`node scripts/refresh-db-map.mjs\` after each migration block.\n\n`;

  for (const tableName of orderedTables) {
    const cols = tableMap.get(tableName);
    md += `### \`${tableName}\`\n\n`;
    md += `| Column | Type | Null | Default | FK |\n`;
    md += `|---|---|---|---|---|\n`;

    for (const col of cols) {
      const fk = fkMap.get(`${tableName}.${col.column_name}`);
      const nullable = col.is_nullable === 'YES' ? 'YES' : 'NO';
      md += `| \`${col.column_name}\` | ${col.data_type} | ${nullable} | ${formatDefault(col.column_default)} | ${formatFK(fk)} |\n`;
    }
    md += '\n';
  }

  return md.trimEnd();
}

async function main() {
  const env = readEnv();
  const pat = env.SUPABASE_ACCESS_TOKEN;
  if (!pat) throw new Error('SUPABASE_ACCESS_TOKEN not found in .env.local');

  console.log('Querying staging DB column specs...');
  const [columns, fkRows] = await Promise.all([
    executeSQL(pat, STAGING_PROJECT_ID, COLUMNS_QUERY),
    executeSQL(pat, STAGING_PROJECT_ID, FK_QUERY),
  ]);

  const tableCount = new Set(columns.map(r => r.table_name)).size;
  console.log(`  ${columns.length} columns across ${tableCount} tables`);
  console.log(`  ${fkRows.length} FK relationships`);

  // Build FK lookup: "table.column" → { foreign_table, foreign_column }
  const fkMap = new Map();
  for (const row of fkRows) {
    fkMap.set(`${row.table_name}.${row.column_name}`, row);
  }

  const columnSpecs = generateColumnSpecs(columns, fkMap);

  // Read current db-map.md
  const current = readFileSync(DB_MAP_PATH, 'utf-8');

  let updated;
  if (current.includes('\n## Column specs')) {
    // Replace existing section
    updated = current.replace(/\n## Column specs[\s\S]*$/, '\n\n' + columnSpecs);
  } else {
    // Append at end
    updated = current.trimEnd() + '\n\n---\n\n' + columnSpecs;
  }

  writeFileSync(DB_MAP_PATH, updated, 'utf-8');
  console.log(`\nDone. docs/db-map.md updated with Column specs section (${tableCount} tables).`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
