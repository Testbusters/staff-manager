import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (profile.role !== 'amministrazione') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [importResult, exportResult] = await Promise.all([
    svc.from('import_runs')
      .select('id, tipo, executed_by, imported, skipped, errors, detail_json, duration_ms, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    svc.from('export_runs')
      .select('id, exported_by, collaborator_count, compensation_count, expense_count, duration_ms, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  // Collect all executor user IDs for email lookup
  const executorIds = [
    ...new Set([
      ...(importResult.data ?? []).map((r) => r.executed_by).filter(Boolean),
      ...(exportResult.data ?? []).map((r) => r.exported_by).filter(Boolean),
    ]),
  ];

  const emailMap: Record<string, string> = {};
  if (executorIds.length > 0) {
    const { data: authUsers } = await svc.auth.admin.listUsers({ perPage: 1000 });
    for (const u of authUsers?.users ?? []) {
      if (executorIds.includes(u.id)) emailMap[u.id] = u.email ?? u.id;
    }
  }

  const imports = (importResult.data ?? []).map((r) => ({
    id: r.id,
    tipo: `import:${r.tipo}`,
    executed_by_email: emailMap[r.executed_by] ?? r.executed_by ?? '',
    imported: r.imported,
    skipped: r.skipped,
    errors: r.errors,
    duration_ms: r.duration_ms ?? null,
    detail_json: r.detail_json ?? null,
    created_at: r.created_at,
  }));

  const exports = (exportResult.data ?? []).map((r) => ({
    id: r.id,
    tipo: 'export:gsheet',
    executed_by_email: emailMap[r.exported_by] ?? r.exported_by ?? '',
    imported: r.collaborator_count ?? 0,
    skipped: 0,
    errors: 0,
    duration_ms: r.duration_ms ?? null,
    detail_json: {
      collaborator_count: r.collaborator_count,
      compensation_count: r.compensation_count,
      expense_count: r.expense_count,
    },
    created_at: r.created_at,
  }));

  const operations = [...imports, ...exports].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return NextResponse.json({ operations });
}
