import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { ROLE_LABELS } from '@/lib/types';
import type { Role } from '@/lib/types';
import { buildExpenseSubmitNotification } from '@/lib/notification-utils';
import {
  getNotificationSettings,
  getCollaboratorInfo,
  getResponsabiliForCollaborator,
} from '@/lib/notification-helpers';
import { sendEmail } from '@/lib/email';
import { emailNuovoInviato } from '@/lib/email-templates';
import { MAX_PENDING_EXPENSES } from '@/lib/rate-limits';
import { expenseCreateApiSchema as createSchema } from '@/lib/schemas/api';

export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const statoFilter = searchParams.get('stato');

  let query = supabase
    .from('expense_reimbursements')
    .select('id, collaborator_id, community_id, categoria, data_spesa, importo, descrizione, stato, liquidated_at, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (statoFilter) {
    const stati = statoFilter.split(',').map((s) => s.trim());
    query = query.in('stato', stati);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  return NextResponse.json({ expenses: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active, member_status')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Utente non attivo' }, { status: 403 });
  if (profile.role !== 'collaboratore') return NextResponse.json({ error: 'Solo i collaboratori possono creare rimborsi' }, { status: 403 });
  if (profile.member_status === 'uscente_senza_compenso') return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });

  const { data: col } = await supabase
    .from('collaborators')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!col) return NextResponse.json({ error: 'Collaboratore non trovato' }, { status: 403 });

  const { data: cc } = await supabase
    .from('collaborator_communities')
    .select('community_id')
    .eq('collaborator_id', col.id)
    .single();

  if (!cc) return NextResponse.json({ error: 'Community non trovata' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }

  // Rate limit: cap pending expenses per collaborator
  const { count: pendingCount } = await supabase
    .from('expense_reimbursements')
    .select('*', { count: 'exact', head: true })
    .eq('collaborator_id', col.id)
    .eq('stato', 'IN_ATTESA');

  if ((pendingCount ?? 0) >= MAX_PENDING_EXPENSES) {
    return NextResponse.json(
      { error: 'Limite rimborsi in attesa raggiunto' },
      { status: 429 },
    );
  }

  const { data: reimbursement, error } = await supabase
    .from('expense_reimbursements')
    .insert({
      collaborator_id: col.id,
      community_id: cc.community_id,
      ...parsed.data,
      stato: 'IN_ATTESA',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  // Insert initial history entry
  await supabase.from('expense_history').insert({
    reimbursement_id: reimbursement.id,
    stato_precedente: null,
    stato_nuovo: 'IN_ATTESA',
    changed_by: user.id,
    role_label: ROLE_LABELS[profile.role as Role],
    note: null,
  });

  // Notify responsabili about new rimborso
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const [settings, collabInfo, responsabili] = await Promise.all([
    getNotificationSettings(svc),
    getCollaboratorInfo(col.id, svc),
    getResponsabiliForCollaborator(col.id, svc),
  ]);
  const setting = settings.get('rimborso_inviato:responsabile_compensi');
  if ((setting?.inapp_enabled || setting?.email_enabled) && responsabili.length > 0) {
    const dataFormatted = parsed.data.data_spesa
      ? new Date(parsed.data.data_spesa).toLocaleDateString('it-IT')
      : '';
    for (const resp of responsabili) {
      if (setting?.inapp_enabled) {
        svc.from('notifications').insert(buildExpenseSubmitNotification(resp.user_id, reimbursement.id)).then(() => {});
      }
      if (setting?.email_enabled && resp.email) {
        const { subject, html } = emailNuovoInviato({
          nomeResponsabile: resp.nome,
          nomeCollaboratore: `${collabInfo?.nome ?? ''} ${collabInfo?.cognome ?? ''}`.trim(),
          tipo: 'Rimborso',
          importo: parsed.data.importo,
          community: '',
          data: dataFormatted,
        });
        sendEmail(resp.email, subject, html).catch(() => {});
      }
    }
  }

  return NextResponse.json({ reimbursement }, { status: 201 });
}
