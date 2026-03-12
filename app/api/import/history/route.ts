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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const runs: ImportRunWithUrl[] = await Promise.all(
    (rows ?? []).map(async (row) => {
      let download_url: string | null = null;
      if (row.storage_path) {
        const { data: signed } = await svc.storage
          .from('imports')
          .createSignedUrl(row.storage_path, 3600);
        download_url = signed?.signedUrl ?? null;
      }
      return {
        id:           row.id,
        tipo:         row.tipo as ImportTipo,
        imported:     row.imported,
        skipped:      row.skipped,
        errors:       row.errors,
        duration_ms:  row.duration_ms,
        created_at:   row.created_at,
        storage_path: row.storage_path,
        download_url,
      };
    }),
  );

  return NextResponse.json({ runs });
}
