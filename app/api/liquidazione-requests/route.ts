import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { sendEmail } from '@/lib/email';
import { emailRichiestaLiquidazione } from '@/lib/email-templates';
import { buildLiquidazioneRequestNotification } from '@/lib/notification-utils';

const createSchema = z.object({
  compensation_ids: z.array(z.string().uuid()).default([]),
  expense_ids: z.array(z.string().uuid()).default([]),
  ha_partita_iva: z.boolean(),
}).refine((d) => d.compensation_ids.length + d.expense_ids.length > 0, {
  message: 'Seleziona almeno un compenso o rimborso.',
});

const MIN_NETTO = 250;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Utente non attivo' }, { status: 403 });
  if (profile.role !== 'collaboratore') {
    return NextResponse.json({ error: 'Solo i collaboratori possono richiedere la liquidazione.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }

  const { compensation_ids, expense_ids, ha_partita_iva } = parsed.data;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Fetch collaborator record (id + iban)
  const { data: collab } = await svc
    .from('collaborators')
    .select('id, iban, nome, cognome')
    .eq('user_id', user.id)
    .single();

  if (!collab) return NextResponse.json({ error: 'Collaboratore non trovato.' }, { status: 400 });
  if (!collab.iban) {
    return NextResponse.json({ error: 'IBAN non configurato. Aggiornalo nel profilo prima di richiedere la liquidazione.' }, { status: 400 });
  }

  // Check no active request
  const { data: existing } = await svc
    .from('liquidazione_requests')
    .select('id')
    .eq('collaborator_id', collab.id)
    .eq('stato', 'in_attesa')
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Hai già una richiesta di liquidazione in attesa.' }, { status: 409 });
  }

  // Validate compensation_ids: must exist, be APPROVATO, belong to this collab
  let compNetto = 0;
  if (compensation_ids.length > 0) {
    const { data: comps } = await svc
      .from('compensations')
      .select('id, stato, importo_netto, collaborator_id')
      .in('id', compensation_ids);

    const invalid = (comps ?? []).filter(
      (c) => c.stato !== 'APPROVATO' || c.collaborator_id !== collab.id,
    );
    if (invalid.length > 0 || (comps ?? []).length !== compensation_ids.length) {
      return NextResponse.json(
        { error: 'Uno o più compensi non sono validi o non appartengono a questo collaboratore.' },
        { status: 422 },
      );
    }
    compNetto = (comps ?? []).reduce((s, c) => s + (c.importo_netto ?? 0), 0);
  }

  // Validate expense_ids
  let expNetto = 0;
  if (expense_ids.length > 0) {
    const { data: exps } = await svc
      .from('expense_reimbursements')
      .select('id, stato, importo, collaborator_id')
      .in('id', expense_ids);

    const invalid = (exps ?? []).filter(
      (e) => e.stato !== 'APPROVATO' || e.collaborator_id !== collab.id,
    );
    if (invalid.length > 0 || (exps ?? []).length !== expense_ids.length) {
      return NextResponse.json(
        { error: 'Uno o più rimborsi non sono validi o non appartengono a questo collaboratore.' },
        { status: 422 },
      );
    }
    expNetto = (exps ?? []).reduce((s, e) => s + (e.importo ?? 0), 0);
  }

  const importo_netto_totale = compNetto + expNetto;
  if (importo_netto_totale < MIN_NETTO) {
    return NextResponse.json(
      { error: `L'importo netto totale (€${importo_netto_totale.toFixed(2)}) è inferiore alla soglia minima di €${MIN_NETTO}.` },
      { status: 422 },
    );
  }

  // Insert — RLS covers ownership
  const { data: newRequest, error: insertError } = await supabase
    .from('liquidazione_requests')
    .insert({
      collaborator_id: collab.id,
      compensation_ids,
      expense_ids,
      importo_netto_totale,
      iban: collab.iban,
      ha_partita_iva,
      stato: 'in_attesa',
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  // Fire-and-forget: notify admins
  (async () => {
    try {
      const { data: adminProfiles } = await svc
        .from('user_profiles')
        .select('user_id')
        .eq('role', 'amministrazione')
        .eq('is_active', true);

      const adminUserIds = (adminProfiles ?? []).map((p) => p.user_id);
      if (adminUserIds.length === 0) return;

      const { data: authData } = await svc.auth.admin.listUsers();
      const emailMap = Object.fromEntries(
        (authData?.users ?? []).map((u) => [u.id, u.email ?? '']),
      );

      const { data: adminCollabs } = await svc
        .from('collaborators')
        .select('user_id, nome, cognome')
        .in('user_id', adminUserIds);
      const collabMap = Object.fromEntries(
        (adminCollabs ?? []).map((c) => [c.user_id, c]),
      );

      const nRecord = compensation_ids.length + expense_ids.length;
      const collabNome = `${collab.nome ?? ''} ${collab.cognome ?? ''}`.trim();

      // Batch insert all notifications in one call
      const notifRows = adminUserIds.map((adminId) =>
        buildLiquidazioneRequestNotification('created', adminId, newRequest.id, importo_netto_totale),
      );
      await svc.from('notifications').insert(notifRows);

      // Emails (fire-and-forget per admin)
      for (const adminId of adminUserIds) {
        const adminEmail = emailMap[adminId];
        if (adminEmail) {
          const adminName = collabMap[adminId]
            ? `${collabMap[adminId].nome ?? ''} ${collabMap[adminId].cognome ?? ''}`.trim()
            : 'Admin';
          const { subject, html } = emailRichiestaLiquidazione({
            nomeAdmin: adminName,
            nomeCollab: collabNome,
            importoNetto: importo_netto_totale,
            iban: collab.iban,
            haPartitaIva: ha_partita_iva,
            nRecord,
          });
          sendEmail(adminEmail, subject, html).catch(() => {});
        }
      }
    } catch (_) {
      // fire-and-forget, never block response
    }
  })();

  return NextResponse.json({ liquidazione_request: newRequest }, { status: 201 });
}

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
    return NextResponse.json({ error: 'Accesso non autorizzato.' }, { status: 403 });
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: requests, error } = await svc
    .from('liquidazione_requests')
    .select('*')
    .eq('stato', 'in_attesa')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  // Two-step: add collab name
  const collabIds = [...new Set((requests ?? []).map((r) => r.collaborator_id))];
  const { data: collabs } = collabIds.length > 0
    ? await svc.from('collaborators').select('id, nome, cognome').in('id', collabIds)
    : { data: [] as { id: string; nome: string; cognome: string }[] };

  const collabMap = Object.fromEntries(
    (collabs ?? []).map((c) => [c.id, `${c.nome ?? ''} ${c.cognome ?? ''}`.trim()]),
  );

  const enriched = (requests ?? []).map((r) => ({
    ...r,
    collabName: collabMap[r.collaborator_id] ?? r.collaborator_id,
  }));

  return NextResponse.json({ requests: enriched });
}
