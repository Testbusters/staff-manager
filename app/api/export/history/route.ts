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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const runs: ExportRunWithUrl[] = await Promise.all(
    (runRows ?? []).map(async (run) => {
      let download_url: string | null = null;
      if (run.storage_path) {
        const { data: signed } = await svc.storage
          .from('exports')
          .createSignedUrl(run.storage_path, 3600);
        download_url = signed?.signedUrl ?? null;
      }
      return {
        id: run.id,
        exported_at: run.exported_at,
        collaborator_count: run.collaborator_count,
        compensation_count: run.compensation_count,
        expense_count: run.expense_count,
        storage_path: run.storage_path,
        download_url,
      };
    }),
  );

  return NextResponse.json({ runs });
}
