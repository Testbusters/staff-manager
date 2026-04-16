import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { canExpenseTransition, applyExpenseTransition } from '@/lib/expense-transitions';
import { getYtd, isOverMassimale } from '@/lib/massimale';
import type { ExpenseAction } from '@/lib/expense-transitions';
import { ROLE_LABELS } from '@/lib/types';
import type { Role, ExpenseStatus } from '@/lib/types';
import {
  buildExpenseNotification,
  EXPENSE_NOTIFIED_ACTIONS,
} from '@/lib/notification-utils';
import type { NotificationPayload } from '@/lib/notification-utils';
import {
  getNotificationSettings,
  getCollaboratorInfo,
} from '@/lib/notification-helpers';
import { sendEmail } from '@/lib/email';
import { getRenderedEmail } from '@/lib/email-template-service';
import { isValidUUID } from '@/lib/validate-id';

const transitionSchema = z.object({
  action: z.enum([
    'approve',
    'reject',
    'mark_liquidated',
    'revert_to_pending',
  ]),
  note: z.string().optional(),
  payment_reference: z.string().optional(),
});

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

  const { data: expense, error: fetchError } = await supabase
    .from('expense_reimbursements')
    .select('id, stato, collaborator_id, importo, data_spesa')
    .eq('id', id)
    .single();

  if (fetchError || !expense) {
    return NextResponse.json({ error: 'Rimborso non trovato' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = transitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }

  const { action, note, payment_reference } = parsed.data;
  const currentStato = expense.stato as ExpenseStatus;

  const check = canExpenseTransition(role, currentStato, action as ExpenseAction, note);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 403 });
  }

  const newStato = applyExpenseTransition(action as ExpenseAction);

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
      .eq('id', expense.collaborator_id)
      .single();
    if (collab && isOverMassimale(getYtd(collab), expense.importo ?? 0, collab.importo_lordo_massimale)) {
      const ytd = getYtd(collab);
      const massimale = collab.importo_lordo_massimale!;
      const eccedenza = ytd + (expense.importo ?? 0) - massimale;
      return NextResponse.json({
        error: `Massimale superato: +€${eccedenza.toFixed(2)} di eccedenza`,
        blocked: [{
          collaboratorId: expense.collaborator_id,
          collabName: `${collab.nome ?? ''} ${collab.cognome ?? ''}`.trim(),
          massimale,
          already_approved: ytd,
          totale: expense.importo ?? 0,
          eccedenza,
          items: [{ id, importo: expense.importo ?? 0, label: null, date: expense.data_spesa ?? null }],
        }],
      }, { status: 422 });
    }
    approveCollab = collab;
  }

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

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error: updateError } = await serviceClient
    .from('expense_reimbursements')
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
      approved_lordo_ytd: currentYtd + (expense.importo ?? 0),
      approved_year: year,
    }).eq('id', expense.collaborator_id);
  }

  // Decrement approved_lordo_ytd counter on revert_to_pending
  if (action === 'revert_to_pending') {
    const { data: revertCollab } = await serviceClient
      .from('collaborators')
      .select('approved_lordo_ytd, approved_year')
      .eq('id', expense.collaborator_id)
      .single();
    if (revertCollab) {
      const currentYtd = getYtd(revertCollab);
      await serviceClient.from('collaborators').update({
        approved_lordo_ytd: Math.max(0, currentYtd - (expense.importo ?? 0)),
      }).eq('id', expense.collaborator_id);
    }
  }

  const { error: historyError } = await serviceClient
    .from('expense_history')
    .insert({
      reimbursement_id: id,
      stato_precedente: currentStato,
      stato_nuovo: newStato,
      changed_by: user.id,
      role_label: ROLE_LABELS[role],
      note: note ?? null,
    });

  if (historyError) {
    console.error('Expense history insert failed:', historyError.message);
  }

  // Load notification settings
  const settings = await getNotificationSettings(serviceClient);

  // ── Notify collaboratore on manager/admin actions ────────────
  if ((EXPENSE_NOTIFIED_ACTIONS as string[]).includes(action)) {
    const collabInfo = await getCollaboratorInfo(expense.collaborator_id, serviceClient);

    if (collabInfo?.user_id) {
      const notif: NotificationPayload = buildExpenseNotification(
        action as 'approve' | 'reject' | 'mark_liquidated',
        collabInfo.user_id,
        id,
        note,
      );

      const eventKeyMap: Record<string, string> = {
        approve:           'rimborso_approvato',
        reject:            'rimborso_rifiutato',
        mark_liquidated:   'rimborso_pagato',
        revert_to_pending: 'rimborso_rimessa_attesa',
      };
      const eventKey = eventKeyMap[action];
      const setting = eventKey ? settings.get(`${eventKey}:collaboratore`) : undefined;

      if (!setting || setting.inapp_enabled) {
        const { error: notifError } = await serviceClient.from('notifications').insert(notif);
        if (notifError) console.error('Notification insert failed:', notifError.message);
      }

      if (setting?.email_enabled && collabInfo.email) {
        const dataFormatted = expense.data_spesa
          ? new Date(expense.data_spesa).toLocaleDateString('it-IT')
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
            tipo: 'Rimborso',
            importo: (expense.importo ?? 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }),
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
