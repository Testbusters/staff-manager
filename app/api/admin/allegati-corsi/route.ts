import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

async function requireAdmin(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null };
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();
  if (!profile?.is_active || profile.role !== 'amministrazione') return { user: null };
  return { user };
}

export async function GET(req: NextRequest) {
  const { user } = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { searchParams } = new URL(req.url);
  const community_id = searchParams.get('community_id');

  let query = svc.from('allegati_globali').select('*').order('updated_at', { ascending: false });
  if (community_id) query = query.eq('community_id', community_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return NextResponse.json({ allegati: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { user } = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const tipo = formData.get('tipo') as string;
  const community_id = formData.get('community_id') as string;
  const file = formData.get('file') as File | null;

  if (!tipo || !community_id || !file) {
    return NextResponse.json({ error: 'tipo, community_id, and file are required' }, { status: 400 });
  }
  if (!['docenza', 'cocoda'].includes(tipo)) {
    return NextResponse.json({ error: 'Invalid tipo' }, { status: 400 });
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = file.name.split('.').pop() ?? 'bin';
  const storagePath = `${community_id}/${tipo}.${ext}`;

  const { error: uploadError } = await svc.storage
    .from('corsi-allegati')
    .upload(storagePath, buffer, { contentType: file.type, upsert: true });

  if (uploadError) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  const { data: urlData } = svc.storage.from('corsi-allegati').getPublicUrl(storagePath);

  const { data, error } = await svc
    .from('allegati_globali')
    .upsert(
      {
        tipo,
        community_id,
        file_url: urlData.publicUrl,
        nome_file: file.name,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tipo,community_id' },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return NextResponse.json({ allegato: data }, { status: 201 });
}
