import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { canTransition, applyTransition } from '@/lib/compensation-transitions';
import { getYtd, isOverMassimale } from '@/lib/massimale';
import type { CompensationAction } from '@/lib/compensation-transitions';
import { ROLE_LABELS } from '@/lib/types';
import type { Role, CompensationStatus } from '@/lib/types';
import {
  buildCompensationNotification,
  buildCompensationReopenNotification,
  COMPENSATION_NOTIFIED_ACTIONS,
} from '@/lib/notification-utils';
import type { NotificationPayload } from '@/lib/notification-utils';
import {
  getNotificationSettings,
  getCollaboratorInfo,
  getResponsabiliForCommunity,
} from '@/lib/notification-helpers';
import { sendEmail } from '@/lib/email';
import { getRenderedEmail } from '@/lib/email-template-service';
import { isValidUUID } from '@/lib/validate-id';
import { compensationTransitionApiSchema as transitionSchema } from '@/lib/schemas/api';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Utente non attivo' }, { status: 403 });

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });
  const role = profile.role as Role;

  // Fetch current compensation (RLS filters access)
  const { data: comp, error: fetchError } = await supabase
    .from('compensations')
    .select('id, stato, collaborator_id, community_id, importo_lordo, data_competenza')
    .eq('id', id)
    .single();

  if (fetchError || !comp) {
    return NextResponse.json({ error: 'Compenso non trovato' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = transitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }

  const { action, note, payment_reference } = parsed.data;
  const currentStato = comp.stato as CompensationStatus;

  // Validate transition
  const check = canTransition(role, currentStato, action as CompensationAction, note);
  if (!check.ok) {
    const status = check.reason_code === 'state' ? 409 : 403;
    return NextResponse.json({ error: check.reason }, { status });
  }

  const newStato = applyTransition(action as CompensationAction);

  // Massimale check + collaborator data (for ytd update after approve)
  let approveCollab: { id: string; nome: string | null; cognome: string | null; importo_lordo_massimale: number | null; approved_lordo_ytd: number; approved_year: number } | null = null;
  if (action === 'approve') {
    const svcCheck = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: collab } = await svcCheck
      .from('collaborators')
      .select('id, nome, cognome, importo_lordo_massimale, approved_lordo_ytd, approved_year')
      .eq('id', comp.collaborator_id)
      .single();
    if (collab && isOverMassimale(getYtd(collab), comp.importo_lordo ?? 0, collab.importo_lordo_massimale)) {
      const ytd = getYtd(collab);
      const massimale = collab.importo_lordo_massimale!;
      const eccedenza = ytd + (comp.importo_lordo ?? 0) - massimale;
      return NextResponse.json({
        error: `Massimale superato: +€${eccedenza.toFixed(2)} di eccedenza`,
        blocked: [{
          collaboratorId: comp.collaborator_id,
          collabName: `${collab.nome ?? ''} ${collab.cognome ?? ''}`.trim(),
          massimale,
          already_approved: ytd,
          totale: comp.importo_lordo ?? 0,
          eccedenza,
          items: [{ id, importo: comp.importo_lordo ?? 0, label: null, date: comp.data_competenza ?? null }],
        }],
      }, { status: 422 });
    }
    approveCollab = collab;
  }

  // Build update payload
  const updatePayload: Record<string, unknown> = { stato: newStato };

  if (action === 'approve') {
    updatePayload.approved_by = user.id;
    updatePayload.approved_at = new Date().toISOString();
  }
  if (action === 'reject') {
    updatePayload.rejection_note = note ?? null;
  }
  if (action === 'mark_liquidated') {
    updatePayload.liquidated_at = new Date().toISOString();
    updatePayload.liquidated_by = user.id;
    updatePayload.payment_reference = payment_reference ?? null;
  }
  if (action === 'revert_to_pending') {
    updatePayload.approved_by = null;
    updatePayload.approved_at = null;
  }

  // Use service role to bypass RLS for transitions the collaboratore RLS doesn't cover
  // (reopen: RIFIUTATO→IN_ATTESA)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error: updateError } = await serviceClient
    .from('compensations')
    .update(updatePayload)
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }

  // Update approved_lordo_ytd counter on approve
  if (action === 'approve' && approveCollab) {
    const year = new Date().getFullYear();
    const currentYtd = getYtd(approveCollab);
    await serviceClient.from('collaborators').update({
      approved_lordo_ytd: currentYtd + (comp.importo_lordo ?? 0),
      approved_year: year,
    }).eq('id', comp.collaborator_id);
  }

  // Decrement approved_lordo_ytd counter on revert_to_pending
  if (action === 'revert_to_pending') {
    const { data: revertCollab } = await serviceClient
      .from('collaborators')
      .select('approved_lordo_ytd, approved_year')
      .eq('id', comp.collaborator_id)
      .single();
    if (revertCollab) {
      const currentYtd = getYtd(revertCollab);
      await serviceClient.from('collaborators').update({
        approved_lordo_ytd: Math.max(0, currentYtd - (comp.importo_lordo ?? 0)),
      }).eq('id', comp.collaborator_id);
    }
  }

  // Insert history entry
  const { error: historyError } = await serviceClient
    .from('compensation_history')
    .insert({
      compensation_id: id,
      stato_precedente: currentStato,
      stato_nuovo: newStato,
      changed_by: user.id,
      role_label: ROLE_LABELS[role],
      note: note ?? null,
    });

  if (historyError) {
    console.error('History insert failed:', historyError.message);
  }

  // Load notification settings
  const settings = await getNotificationSettings(serviceClient);

  // ── Notify responsabili when collaboratore reopens a compensation ───
  if (action === 'reopen' && comp.community_id) {
    const setting = settings.get('comp_inviato:responsabile_compensi');
    if (!setting || setting.inapp_enabled || setting.email_enabled) {
      const responsabili = await getResponsabiliForCommunity(comp.community_id, serviceClient);
      for (const resp of responsabili) {
        if (!setting || setting.inapp_enabled) {
          const notif = buildCompensationReopenNotification(resp.user_id, id);
          await serviceClient.from('notifications').insert(notif).then(({ error }) => {
            if (error) console.error('Reopen notification insert failed:', error.message);
          });
        }
      }
    }
  }

  // ── Notify collaboratore on manager/admin actions ─────────────
  if ((COMPENSATION_NOTIFIED_ACTIONS as string[]).includes(action)) {
    const collabInfo = await getCollaboratorInfo(comp.collaborator_id, serviceClient);

    if (collabInfo?.user_id) {
      const notif: NotificationPayload = buildCompensationNotification(
        action as 'approve' | 'reject' | 'mark_liquidated',
        collabInfo.user_id,
        id,
        note,
      );

      const eventKeyMap: Record<string, string> = {
        approve:           'comp_approvato',
        reject:            'comp_rifiutato',
        mark_liquidated:   'comp_pagato',
        revert_to_pending: 'comp_rimessa_attesa',
      };
      const eventKey = eventKeyMap[action];
      const setting = eventKey ? settings.get(`${eventKey}:collaboratore`) : undefined;

      if (!setting || setting.inapp_enabled) {
        const { error: notifError } = await serviceClient.from('notifications').insert(notif);
        if (notifError) console.error('Notification insert failed:', notifError.message);
      }

      if (setting?.email_enabled && collabInfo.email) {
        const dataFormatted = comp.data_competenza
          ? new Date(comp.data_competenza).toLocaleDateString('it-IT')
          : '';
        const emailKeyMap: Record<string, string> = {
          approve:           'E2',
          reject:            'E3',
          mark_liquidated:   'E4',
          revert_to_pending: 'E13',
        };
        const emailKey = emailKeyMap[action];
        if (emailKey) {
          getRenderedEmail(emailKey, {
            nome: collabInfo.nome,
            tipo: 'Compenso',
            importo: (comp.importo_lordo ?? 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }),
            data: dataFormatted,
            ...(note ? { nota: note } : {}),
          }).then((payload) => {
            sendEmail(collabInfo.email!, payload.subject, payload.html).catch(() => {});
          }).catch(() => {});
        }
      }
    }
  }

  return NextResponse.json({ stato: newStato });
}
