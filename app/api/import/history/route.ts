import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import type { ImportRunWithUrl, ImportTipo } from '@/lib/import-history-utils';

export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active || profile.role !== 'amministrazione') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get('tipo') as ImportTipo | null;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let query = svc
    .from('import_runs')
    .select('id, tipo, imported, skipped, errors, duration_ms, created_at, storage_path')
    .order('created_at', { ascending: false })
    .limit(50);

  if (tipo) query = query.eq('tipo', tipo);

  const { data: rows, error } = await query;
  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  // Batch-sign all storage paths in a single call instead of N+1 individual requests
  const paths = (rows ?? [])
    .map((r) => r.storage_path)
    .filter((p): p is string => p != null);

  const urlMap = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await svc.storage
      .from('imports')
      .createSignedUrls(paths, 3600);
    for (const entry of signed ?? []) {
      if (entry.signedUrl && entry.path) urlMap.set(entry.path, entry.signedUrl);
    }
  }

  const runs: ImportRunWithUrl[] = (rows ?? []).map((row) => ({
    id:           row.id,
    tipo:         row.tipo as ImportTipo,
    imported:     row.imported,
    skipped:      row.skipped,
    errors:       row.errors,
    duration_ms:  row.duration_ms,
    created_at:   row.created_at,
    storage_path: row.storage_path,
    download_url: row.storage_path ? (urlMap.get(row.storage_path) ?? null) : null,
  }));

  return NextResponse.json({ runs });
}
