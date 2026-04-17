import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import type { ExportRunWithUrl } from '@/lib/export-utils';

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Utente non attivo' }, { status: 403 });
  if (profile.role !== 'amministrazione') {
    return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: runRows, error } = await svc
    .from('export_runs')
    .select('id, exported_at, collaborator_count, compensation_count, expense_count, storage_path')
    .order('exported_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  // Batch-sign all storage paths in a single call instead of N+1 individual requests
  const paths = (runRows ?? [])
    .map((r) => r.storage_path)
    .filter((p): p is string => p != null);

  const urlMap = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await svc.storage
      .from('exports')
      .createSignedUrls(paths, 3600);
    for (const entry of signed ?? []) {
      if (entry.signedUrl && entry.path) urlMap.set(entry.path, entry.signedUrl);
    }
  }

  const runs: ExportRunWithUrl[] = (runRows ?? []).map((run) => ({
    id: run.id,
    exported_at: run.exported_at,
    collaborator_count: run.collaborator_count,
    compensation_count: run.compensation_count,
    expense_count: run.expense_count,
    storage_path: run.storage_path,
    download_url: run.storage_path ? (urlMap.get(run.storage_path) ?? null) : null,
  }));

  return NextResponse.json({ runs });
}
