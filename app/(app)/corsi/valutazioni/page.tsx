import { redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Star } from 'lucide-react';
import ValutazioniRespCittPage from '@/components/corsi/ValutazioniRespCittPage';

export default async function CorsiValutazioniPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active, citta_responsabile')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) redirect('/');
  if (profile.role !== 'responsabile_cittadino') redirect('/');

  const cittaResp = profile.citta_responsabile as string | null;

  if (!cittaResp) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-foreground mb-4">Valutazione Corsi</h1>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            La tua città di responsabilità non è ancora stata configurata. Contatta l&apos;amministrazione.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: corsi } = await svc
    .from('corsi')
    .select('id, nome, codice_identificativo')
    .eq('citta', cittaResp)
    .order('data_inizio', { ascending: false });

  if (!corsi || corsi.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-foreground mb-1">Valutazione Corsi</h1>
        <p className="text-sm text-muted-foreground mb-6">Città: {cittaResp}</p>
        <EmptyState
          icon={Star}
          title="Nessun corso assegnato"
          description="Non ci sono ancora corsi assegnati alla tua città."
        />
      </div>
    );
  }

  // Fetch lezioni for all corsi
  const corsiIds = corsi.map((c: { id: string }) => c.id);
  const { data: lezioni } = await svc
    .from('lezioni')
    .select('id, corso_id')
    .in('corso_id', corsiIds);

  const lezioniIds = (lezioni ?? []).map((l: { id: string }) => l.id);

  // Fetch assegnazioni for these lezioni
  const { data: assegnazioni } = lezioniIds.length > 0
    ? await svc.from('assegnazioni').select('id, lezione_id, collaborator_id, ruolo, valutazione').in('lezione_id', lezioniIds)
    : { data: [] };

  // Fetch collaborator names
  const collabIds = [...new Set((assegnazioni ?? []).map((a: { collaborator_id: string }) => a.collaborator_id))];
  const collabs = collabIds.length > 0
    ? (await svc.from('collaborators').select('id, user_id').in('id', collabIds)).data ?? []
    : [];
  const userIds = collabs.map((c: { user_id: string }) => c.user_id);
  const uprof = userIds.length > 0
    ? (await svc.from('user_profiles').select('user_id, nome, cognome').in('user_id', userIds)).data ?? []
    : [];

  const collabMap: Record<string, { nome: string; cognome: string }> = {};
  for (const c of collabs) {
    const p = uprof.find((p: { user_id: string }) => p.user_id === c.user_id);
    if (p) collabMap[c.id] = { nome: p.nome, cognome: p.cognome };
  }

  // Build per-corso, per-collab groups
  const corsiValutazioni = corsi.map((corso: { id: string; nome: string; codice_identificativo: string }) => {
    const corsoLezioniIds = (lezioni ?? [])
      .filter((l: { corso_id: string }) => l.corso_id === corso.id)
      .map((l: { id: string }) => l.id);

    const corsoAssegnazioni = (assegnazioni ?? []).filter(
      (a: { lezione_id: string }) => corsoLezioniIds.includes(a.lezione_id),
    );

    // Group by collaborator_id
    const byCollab = new Map<string, { assegnazioniIds: string[]; valutazione: number | null }>();
    for (const a of corsoAssegnazioni) {
      const existing = byCollab.get(a.collaborator_id);
      if (existing) {
        existing.assegnazioniIds.push(a.id);
        if (existing.valutazione === null && a.valutazione !== null) {
          existing.valutazione = a.valutazione;
        }
      } else {
        byCollab.set(a.collaborator_id, {
          assegnazioniIds: [a.id],
          valutazione: a.valutazione ?? null,
        });
      }
    }

    const collabs = Array.from(byCollab.entries()).map(([collaborator_id, data]) => ({
      collaborator_id,
      nome: collabMap[collaborator_id]?.nome ?? '—',
      cognome: collabMap[collaborator_id]?.cognome ?? '',
      ...data,
    }));

    return {
      corso: { id: corso.id, nome: corso.nome, codice: corso.codice_identificativo },
      collabs,
    };
  }).filter((cv: { collabs: unknown[] }) => cv.collabs.length > 0);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-foreground mb-1">Valutazione Corsi</h1>
      <p className="text-sm text-muted-foreground mb-6">Città: {cittaResp}</p>
      {corsiValutazioni.length === 0 ? (
        <EmptyState
          icon={Star}
          title="Nessuna assegnazione"
          description="Non ci sono ancora collaboratori assegnati ai corsi della tua città."
        />
      ) : (
        <ValutazioniRespCittPage corsiValutazioni={corsiValutazioni} />
      )}
    </div>
  );
}
