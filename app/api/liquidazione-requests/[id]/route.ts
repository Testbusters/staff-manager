import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { sendEmail } from '@/lib/email';
import { emailEsitoLiquidazione } from '@/lib/email-templates';
import { buildLiquidazioneRequestNotification } from '@/lib/notification-utils';
import { ROLE_LABELS } from '@/lib/types';

const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('revoca') }),
  z.object({ action: z.literal('accetta') }),
  z.object({ action: z.literal('annulla'), note_admin: z.string().optional() }),
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Utente non attivo' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: req, error: fetchError } = await svc
    .from('liquidazione_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !req) return NextResponse.json({ error: 'Richiesta non trovata.' }, { status: 404 });

  const { action } = parsed.data;

  // ── REVOCA (collaboratore) ──────────────────────────────────
  if (action === 'revoca') {
    if (profile.role !== 'collaboratore') {
      return NextResponse.json({ error: 'Solo il collaboratore può revocare la propria richiesta.' }, { status: 403 });
    }

    // Verify ownership
    const { data: collab } = await svc
      .from('collaborators')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!collab || collab.id !== req.collaborator_id) {
      return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 });
    }

    if (req.stato !== 'in_attesa') {
      return NextResponse.json({ error: 'Solo le richieste in attesa possono essere revocate.' }, { status: 409 });
    }

    // Use user session client — RLS liq_req_collab_update covers this
    const { data: updated, error: updateError } = await supabase
      .from('liquidazione_requests')
      .update({ stato: 'annullata' })
      .eq('id', id)
      .select()
      .single();

    if (updateError) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
    return NextResponse.json({ liquidazione_request: updated });
  }

  // ── ACCETTA / ANNULLA (admin) ───────────────────────────────
  if (profile.role !== 'amministrazione') {
    return NextResponse.json({ error: 'Accesso non autorizzato.' }, { status: 403 });
  }

  if (req.stato !== 'in_attesa') {
    return NextResponse.json({ error: 'Solo le richieste in attesa possono essere elaborate.' }, { status: 409 });
  }

  const now = new Date().toISOString();

  if (action === 'accetta') {
    // Bulk-liquidate compensations
    if (req.compensation_ids?.length > 0) {
      const historyRows = req.compensation_ids.map((cid: string) => ({
        compensation_id: cid,
        stato_precedente: 'APPROVATO',
        stato_nuovo: 'LIQUIDATO',
        changed_by: user.id,
        role_label: ROLE_LABELS['amministrazione'],
        note: null,
      }));

      const { error: compUpdateError } = await svc
        .from('compensations')
        .update({ stato: 'LIQUIDATO', liquidated_at: now, liquidated_by: user.id })
        .in('id', req.compensation_ids);

      if (compUpdateError) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

      svc.from('compensation_history').insert(historyRows).then(({ error }) => {
        if (error) console.error('compensation_history insert failed:', error.message);
      });
    }

    // Bulk-liquidate expenses
    if (req.expense_ids?.length > 0) {
      const expHistoryRows = req.expense_ids.map((eid: string) => ({
        reimbursement_id: eid,
        stato_precedente: 'APPROVATO',
        stato_nuovo: 'LIQUIDATO',
        changed_by: user.id,
        role_label: ROLE_LABELS['amministrazione'],
        note: null,
      }));

      const { error: expUpdateError } = await svc
        .from('expense_reimbursements')
        .update({ stato: 'LIQUIDATO', liquidated_at: now, liquidated_by: user.id })
        .in('id', req.expense_ids);

      if (expUpdateError) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

      svc.from('expense_history').insert(expHistoryRows).then(({ error }) => {
        if (error) console.error('expense_history insert failed:', error.message);
      });
    }

    const { data: updated, error: updateError } = await svc
      .from('liquidazione_requests')
      .update({ stato: 'accettata', processed_at: now, processed_by: user.id })
      .eq('id', id)
      .select()
      .single();

    if (updateError) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

    // Fire-and-forget: notify collab
    (async () => {
      try {
        const { data: collab } = await svc
          .from('collaborators')
          .select('user_id, nome, cognome')
          .eq('id', req.collaborator_id)
          .single();
        if (!collab?.user_id) return;

        await svc.from('notifications').insert(
          buildLiquidazioneRequestNotification('accettata', collab.user_id, id, req.importo_netto_totale),
        );

        const { data: authUser } = await svc.auth.admin.getUserById(collab.user_id);
        const email = authUser?.user?.email;
        if (email) {
          const { subject, html } = emailEsitoLiquidazione({
            nomeCollab: `${collab.nome ?? ''} ${collab.cognome ?? ''}`.trim(),
            esito: 'accettata',
            importoNetto: req.importo_netto_totale,
          });
          sendEmail(email, subject, html).catch(() => {});
        }
      } catch (_) {}
    })();

    return NextResponse.json({ liquidazione_request: updated });
  }

  // action === 'annulla'
  const note_admin = 'note_admin' in parsed.data ? parsed.data.note_admin : undefined;

  const { data: updated, error: updateError } = await svc
    .from('liquidazione_requests')
    .update({ stato: 'annullata', note_admin: note_admin ?? null, processed_at: now, processed_by: user.id })
    .eq('id', id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  // Fire-and-forget: notify collab
  (async () => {
    try {
      const { data: collab } = await svc
        .from('collaborators')
        .select('user_id, nome, cognome')
        .eq('id', req.collaborator_id)
        .single();
      if (!collab?.user_id) return;

      await svc.from('notifications').insert(
        buildLiquidazioneRequestNotification('annullata', collab.user_id, id, req.importo_netto_totale, note_admin),
      );

      const { data: authUser } = await svc.auth.admin.getUserById(collab.user_id);
      const email = authUser?.user?.email;
      if (email) {
        const { subject, html } = emailEsitoLiquidazione({
          nomeCollab: `${collab.nome ?? ''} ${collab.cognome ?? ''}`.trim(),
          esito: 'annullata',
          importoNetto: req.importo_netto_totale,
          nota: note_admin,
        });
        sendEmail(email, subject, html).catch(() => {});
      }
    } catch (_) {}
  })();

  return NextResponse.json({ liquidazione_request: updated });
}
