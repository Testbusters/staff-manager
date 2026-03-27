import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { emailAssegnazioneCorsi } from '@/lib/email-templates';
import { getCollaboratorInfo } from '@/lib/notification-helpers';

const schema = z.object({
  lezione_id: z.string().uuid(),
  collaborator_id: z.string().uuid(),
  ruolo: z.enum(['cocoda']),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'responsabile_cittadino') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }

  const { lezione_id, collaborator_id, ruolo } = parsed.data;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Duplicate check
  const { data: existing } = await svc
    .from('assegnazioni')
    .select('id')
    .eq('lezione_id', lezione_id)
    .eq('collaborator_id', collaborator_id)
    .eq('ruolo', ruolo)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Assegnazione già esistente' }, { status: 409 });
  }

  const { data, error } = await svc
    .from('assegnazioni')
    .insert({ lezione_id, collaborator_id, ruolo, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  // E13: send assignment email for CoCoD'à fire-and-forget
  try {
    const info = await getCollaboratorInfo(collaborator_id, svc);
    if (info?.email) {
      const { data: lez } = await svc.from('lezioni').select('corso_id').eq('id', lezione_id).single();
      if (lez) {
        const { data: corso } = await svc.from('corsi').select('nome').eq('id', lez.corso_id).single();
        if (corso) {
          const { subject, html } = emailAssegnazioneCorsi({
            nome: info.nome,
            corso: corso.nome,
            ruolo: "CoCoD'à",
          });
          sendEmail(info.email, subject, html).catch(() => {});
        }
      }
    }
  } catch {
    // fire-and-forget — never block the response
  }

  return NextResponse.json({ assegnazione: data }, { status: 201 });
}
