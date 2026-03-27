import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { emailAssegnazioneCorsi } from '@/lib/email-templates';
import { getCollaboratorInfo } from '@/lib/notification-helpers';

const ReviewSchema = z.object({
  stato: z.enum(['accettata', 'ritirata', 'in_attesa']),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, citta_responsabile')
    .eq('user_id', user.id)
    .single();

  const role = profile?.role;
  const { id } = await params;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // collaboratore: withdraw own candidatura (no body needed)
  if (role === 'collaboratore') {
    const { data: collab } = await svc
      .from('collaborators')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!collab) {
      return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });
    }

    const { data: candidatura } = await svc
      .from('candidature')
      .select('id, collaborator_id, stato')
      .eq('id', id)
      .maybeSingle();

    if (!candidatura) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (candidatura.collaborator_id !== collab.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (candidatura.stato !== 'in_attesa') {
      return NextResponse.json({ error: 'Cannot withdraw — candidatura is not in_attesa' }, { status: 409 });
    }

    const { data, error } = await svc
      .from('candidature')
      .update({ stato: 'ritirata' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
    }

    return NextResponse.json({ candidatura: data });
  }

  // admin / resp.citt: review candidatura (stato in body)
  if (role !== 'amministrazione' && role !== 'responsabile_cittadino') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }
  const { stato } = parsed.data;

  const { data: candidatura } = await svc
    .from('candidature')
    .select('id, tipo, stato, city_user_id, lezione_id, collaborator_id')
    .eq('id', id)
    .maybeSingle();

  if (!candidatura) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!['docente_lezione', 'qa_lezione'].includes(candidatura.tipo)) {
    // citta_corso candidature: resp.citt can only withdraw their own
    if (role === 'responsabile_cittadino' && candidatura.tipo === 'citta_corso') {
      if (candidatura.city_user_id !== user.id || stato !== 'ritirata') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Cannot review this candidatura type' }, { status: 403 });
    }
  }

  // Guard: in_attesa is only valid if current stato is accettata (revoke)
  if (stato === 'in_attesa' && candidatura.stato !== 'accettata') {
    return NextResponse.json({ error: 'Can only revert to in_attesa from accettata' }, { status: 409 });
  }

  // resp.citt: verify the lezione's corso belongs to their city
  if (role === 'responsabile_cittadino' && candidatura.tipo !== 'citta_corso') {
    if (!profile?.citta_responsabile) {
      return NextResponse.json({ error: 'Forbidden — no citta_responsabile set' }, { status: 403 });
    }

    const { data: lezione } = await svc
      .from('lezioni')
      .select('corso_id')
      .eq('id', candidatura.lezione_id!)
      .single();

    const { data: corso } = lezione
      ? await svc.from('corsi').select('citta').eq('id', lezione.corso_id).single()
      : { data: null };

    if (!corso || corso.citta !== profile.citta_responsabile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const { data, error } = await svc
    .from('candidature')
    .update({ stato })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }

  // E13: send assignment email when candidatura is accepted
  if (stato === 'accettata' && candidatura.collaborator_id) {
    try {
      const info = await getCollaboratorInfo(candidatura.collaborator_id, svc);
      if (info?.email) {
        const ruoloLabel = candidatura.tipo === 'qa_lezione' ? "Q&A" : 'Docente';

        // Fetch corso name for the email
        let corsoNome = '';
        if (candidatura.lezione_id) {
          const { data: lez } = await svc.from('lezioni').select('corso_id').eq('id', candidatura.lezione_id).single();
          if (lez) {
            const { data: c } = await svc.from('corsi').select('nome').eq('id', lez.corso_id).single();
            corsoNome = c?.nome ?? '';
          }
        }

        const { subject, html } = emailAssegnazioneCorsi({
          nome: info.nome,
          corso: corsoNome,
          ruolo: ruoloLabel,
        });
        sendEmail(info.email, subject, html).catch(() => {});
      }
    } catch {
      // fire-and-forget — never block the response
    }
  }

  return NextResponse.json({ candidatura: data });
}
