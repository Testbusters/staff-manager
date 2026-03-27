import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ROLE_LABELS } from '@/lib/types';
import type { Role } from '@/lib/types';

const editSchema = z.object({
  importo_lordo: z.number().positive('Importo lordo deve essere positivo'),
  ritenuta_acconto: z.number().min(0, 'Ritenuta non può essere negativa'),
  data_competenza: z.string().min(1, 'Data competenza obbligatoria'),
  nome_servizio_ruolo: z.string().min(1, 'Nome servizio/ruolo obbligatorio'),
  competenza: z.string().min(1, 'Competenza obbligatoria'),
  info_specifiche: z.string().optional(),
});

function formatCurrencyDiff(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

function formatDateDiff(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export async function PATCH(
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

  const role = profile.role as Role;
  if (role !== 'amministrazione' && role !== 'responsabile_compensi') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const { id } = await params;

  // Fetch current compensation (RLS filters access)
  const { data: comp, error: fetchError } = await supabase
    .from('compensations')
    .select('id, stato, collaborator_id, importo_lordo, ritenuta_acconto, importo_netto, data_competenza, nome_servizio_ruolo, competenza, info_specifiche')
    .eq('id', id)
    .single();

  if (fetchError || !comp) {
    return NextResponse.json({ error: 'Compenso non trovato' }, { status: 404 });
  }

  if (comp.stato !== 'IN_ATTESA') {
    return NextResponse.json({ error: 'Il compenso non è modificabile in questo stato' }, { status: 403 });
  }

  // For responsabile_compensi: verify collaborator belongs to a managed community
  if (role === 'responsabile_compensi') {
    const { data: managed } = await supabase
      .from('user_community_access')
      .select('community_id')
      .eq('user_id', user.id);

    const communityIds = (managed ?? []).map((r) => r.community_id);
    if (communityIds.length === 0) {
      return NextResponse.json({ error: 'Non autorizzato su questo collaboratore' }, { status: 403 });
    }

    const { data: access } = await supabase
      .from('collaborator_communities')
      .select('collaborator_id')
      .eq('collaborator_id', comp.collaborator_id)
      .in('community_id', communityIds)
      .limit(1)
      .single();

    if (!access) {
      return NextResponse.json({ error: 'Non autorizzato su questo collaboratore' }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => null);
  const parsed = editSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }

  const { importo_lordo, ritenuta_acconto, data_competenza, nome_servizio_ruolo, competenza, info_specifiche } = parsed.data;
  const importo_netto = Math.round((importo_lordo - ritenuta_acconto) * 100) / 100;

  // Build human-readable diff for history note
  const diffs: string[] = [];
  if (importo_lordo !== comp.importo_lordo) {
    diffs.push(`importo_lordo: ${formatCurrencyDiff(comp.importo_lordo)} → ${formatCurrencyDiff(importo_lordo)}`);
  }
  if (ritenuta_acconto !== comp.ritenuta_acconto) {
    diffs.push(`ritenuta_acconto: ${formatCurrencyDiff(comp.ritenuta_acconto)} → ${formatCurrencyDiff(ritenuta_acconto)}`);
  }
  if (data_competenza !== comp.data_competenza) {
    diffs.push(`data_competenza: ${formatDateDiff(comp.data_competenza)} → ${formatDateDiff(data_competenza)}`);
  }
  if (nome_servizio_ruolo !== comp.nome_servizio_ruolo) {
    diffs.push(`nome_servizio_ruolo: "${comp.nome_servizio_ruolo ?? '—'}" → "${nome_servizio_ruolo}"`);
  }
  if (competenza !== comp.competenza) {
    diffs.push(`competenza: ${comp.competenza ?? '—'} → ${competenza}`);
  }
  const infoNew = info_specifiche?.trim() ?? null;
  const infoOld = comp.info_specifiche ?? null;
  if (infoNew !== infoOld) {
    diffs.push(`info_specifiche: "${infoOld ?? '—'}" → "${infoNew ?? '—'}"`);
  }

  const noteText = diffs.length > 0 ? diffs.join('; ') : 'Nessuna modifica';

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error: updateError } = await svc
    .from('compensations')
    .update({
      importo_lordo,
      ritenuta_acconto,
      importo_netto,
      data_competenza,
      nome_servizio_ruolo,
      competenza,
      info_specifiche: infoNew,
    })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }

  const { error: historyError } = await svc
    .from('compensation_history')
    .insert({
      compensation_id: id,
      stato_precedente: comp.stato,
      stato_nuovo: comp.stato,
      changed_by: user.id,
      role_label: ROLE_LABELS[role],
      note: noteText,
    });

  if (historyError) {
    console.error('History insert failed:', historyError.message);
  }

  return NextResponse.json({ ok: true });
}
