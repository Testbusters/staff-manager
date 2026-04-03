import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { z } from 'zod';

const feedbackSchema = z.object({
  categoria: z.enum(['Bug', 'Suggerimento', 'Domanda', 'Altro']),
  pagina:    z.string().max(500).default(''),
  messaggio: z.string().min(1, 'Messaggio obbligatorio').max(5000),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 403 });

  const fd = await req.formData();
  const raw = {
    categoria: fd.get('categoria'),
    pagina:    fd.get('pagina') ?? '',
    messaggio: fd.get('messaggio'),
  };

  const parsed = feedbackSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dati non validi' },
      { status: 400 },
    );
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: created, error: insertError } = await svc
    .from('feedback')
    .insert({
      user_id:   user.id,
      role:      profile.role,
      categoria: parsed.data.categoria,
      pagina:    parsed.data.pagina,
      messaggio: parsed.data.messaggio,
    })
    .select('id')
    .single();

  if (insertError || !created) {
    return NextResponse.json({ error: 'Errore durante il salvataggio' }, { status: 500 });
  }

  // Upload screenshot if present (fire-and-forget — does not block the 201 response)
  const screenshotFile = fd.get('screenshot');
  if (screenshotFile instanceof File && screenshotFile.size > 0) {
    const ext = screenshotFile.name.split('.').pop()?.toLowerCase() ?? 'png';
    const uploadPath = `${created.id}/screenshot.${ext}`;
    const { type, name: _name } = screenshotFile;
    screenshotFile.arrayBuffer().then((ab) => {
      const buffer = Buffer.from(ab);
      return svc.storage.from('feedback').upload(uploadPath, buffer, { contentType: type });
    }).then(({ error: uploadError }) => {
      if (!uploadError) {
        svc.from('feedback').update({ screenshot_path: uploadPath }).eq('id', created.id).then(() => {});
      }
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
