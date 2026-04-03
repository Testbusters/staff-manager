import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { emailAssegnazioneCorsi } from '@/lib/email-templates';
import { getCollaboratorInfo } from '@/lib/notification-helpers';

const schema = z.object({
  corso_id: z.string().uuid(),
  collaborator_ids: z.array(z.string().uuid()).min(1),
  ruolo: z.enum(['cocoda', 'qa']),
});

const MAX_COCODA = 2;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active, citta_responsabile')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (profile.role !== 'responsabile_cittadino') {
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

  const { corso_id, collaborator_ids, ruolo } = parsed.data;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Fetch corso — verify city ownership
  const { data: corso } = await svc
    .from('corsi')
    .select('id, nome, citta, max_qa_per_lezione')
    .eq('id', corso_id)
    .single();

  if (!corso) return NextResponse.json({ error: 'Corso non trovato' }, { status: 404 });

  if (profile.citta_responsabile && corso.citta !== profile.citta_responsabile) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Validate max per ruolo
  if (ruolo === 'cocoda' && collaborator_ids.length > MAX_COCODA) {
    return NextResponse.json({ error: `Massimo ${MAX_COCODA} CoCoD'à per corso` }, { status: 422 });
  }
  if (ruolo === 'qa') {
    const maxQA = corso.max_qa_per_lezione ?? 0;
    if (maxQA === 0) {
      return NextResponse.json({ error: 'Q&A non abilitati per questo corso' }, { status: 422 });
    }
    if (collaborator_ids.length > maxQA) {
      return NextResponse.json({ error: `Massimo ${maxQA} Q&A per lezione` }, { status: 422 });
    }
  }

  // Fetch all lezioni for the corso
  const { data: lezioni } = await svc
    .from('lezioni')
    .select('id')
    .eq('corso_id', corso_id);

  if (!lezioni || lezioni.length === 0) {
    return NextResponse.json({ created: 0, skipped: 0 });
  }

  let created = 0;
  let skipped = 0;

  for (const lezione of lezioni) {
    for (const collaborator_id of collaborator_ids) {
      const { error } = await svc
        .from('assegnazioni')
        .insert({ lezione_id: lezione.id, collaborator_id, ruolo, created_by: user.id });

      if (error) {
        if (error.code === '23505') {
          // Unique violation — skip duplicate
          skipped++;
        } else {
          return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
        }
      } else {
        created++;
      }
    }
  }

  // E13: fire-and-forget assignment emails
  const ruoloLabel = ruolo === 'qa' ? 'Q&A' : "CoCoD'à";
  for (const collaborator_id of collaborator_ids) {
    getCollaboratorInfo(collaborator_id, svc).then((info) => {
      if (info?.email) {
        const { subject, html } = emailAssegnazioneCorsi({
          nome: info.nome,
          corso: corso.nome,
          ruolo: ruoloLabel,
        });
        sendEmail(info.email, subject, html).catch(() => {});
      }
    }).catch(() => {});
  }

  return NextResponse.json({ created, skipped }, { status: 201 });
}
