import { redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Star } from 'lucide-react';
import ValutazioniRespCittPage from '@/components/corsi/ValutazioniRespCittPage';

interface ValutazioneEntry {
  collaborator_id: string;
  nome: string;
  cognome: string;
  ruolo: 'docente' | 'cocoda';
  materia: string | null;
  assegnazioniIds: string[];
  totalLezioni: number;
  assignedLezioni: number;
  thresholdMet: boolean;
  valutazione: number | null;
}

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

  // Fetch lezioni with materie
  const corsiIds = corsi.map((c: { id: string }) => c.id);
  const { data: lezioni } = await svc
    .from('lezioni')
    .select('id, corso_id, materie')
    .in('corso_id', corsiIds);

  const lezioniIds = (lezioni ?? []).map((l: { id: string }) => l.id);

  // Fetch assegnazioni for docente and cocoda only (not qa - no valutazione for qa)
  const { data: assegnazioni } = lezioniIds.length > 0
    ? await svc
        .from('assegnazioni')
        .select('id, lezione_id, collaborator_id, ruolo, valutazione')
        .in('lezione_id', lezioniIds)
        .in('ruolo', ['docente', 'cocoda'])
    : { data: [] };

  // Fetch collaborator names
  const collabIds = [...new Set((assegnazioni ?? []).map((a: { collaborator_id: string }) => a.collaborator_id))];
  const collabRows = collabIds.length > 0
    ? (await svc.from('collaborators').select('id, nome, cognome').in('id', collabIds)).data ?? []
    : [];

  const collabMap: Record<string, { nome: string; cognome: string }> = {};
  for (const c of collabRows) {
    collabMap[c.id] = { nome: c.nome ?? '-', cognome: c.cognome ?? '' };
  }

  // Build lezione -> materie lookup
  const lezioneMaterie: Record<string, string[]> = {};
  const lezioneCorso: Record<string, string> = {};
  for (const l of lezioni ?? []) {
    lezioneMaterie[l.id] = l.materie ?? [];
    lezioneCorso[l.id] = l.corso_id;
  }

  // Build per-corso structured data
  const corsiValutazioni = corsi.map((corso: { id: string; nome: string; codice_identificativo: string }) => {
    const corsoLezioni = (lezioni ?? []).filter((l: { corso_id: string }) => l.corso_id === corso.id);
    const corsoLezioniIds = new Set(corsoLezioni.map((l: { id: string }) => l.id));

    const corsoAssegnazioni = (assegnazioni ?? []).filter(
      (a: { lezione_id: string }) => corsoLezioniIds.has(a.lezione_id),
    );

    // Count lezioni per materia: a composite lezione (es. ['M','F']) contribuisce a entrambi i contatori
    const lezioniPerMateria: Record<string, number> = {};
    for (const l of corsoLezioni) {
      for (const m of (l.materie ?? [])) {
        lezioniPerMateria[m] = (lezioniPerMateria[m] ?? 0) + 1;
      }
    }
    const totalCorsoLezioni = corsoLezioni.length;

    // Group: (collaborator_id, ruolo, materia) -> entries
    const groupKey = (collabId: string, ruolo: string, materia: string | null) =>
      `${collabId}|${ruolo}|${materia ?? '__all__'}`;

    type Group = {
      collaborator_id: string;
      ruolo: 'docente' | 'cocoda';
      materia: string | null;
      assegnazioniIds: string[];
      assignedLezioniIds: Set<string>;
      valutazione: number | null;
    };

    const groups = new Map<string, Group>();

    const upsertGroup = (
      collabId: string,
      ruolo: 'docente' | 'cocoda',
      materia: string | null,
      assegnazioneId: string,
      lezioneId: string,
      valutazione: number | null,
    ) => {
      const key = groupKey(collabId, ruolo, materia);
      const existing = groups.get(key);
      if (existing) {
        existing.assegnazioniIds.push(assegnazioneId);
        existing.assignedLezioniIds.add(lezioneId);
        if (existing.valutazione === null && valutazione !== null) {
          existing.valutazione = valutazione;
        }
      } else {
        groups.set(key, {
          collaborator_id: collabId,
          ruolo,
          materia,
          assegnazioniIds: [assegnazioneId],
          assignedLezioniIds: new Set([lezioneId]),
          valutazione: valutazione ?? null,
        });
      }
    };

    for (const a of corsoAssegnazioni) {
      if (a.ruolo === 'docente') {
        // Split per materia: docente su lezione composita ['M','F'] contribuisce a bucket M e F
        const materie = lezioneMaterie[a.lezione_id] ?? [];
        for (const materia of materie) {
          upsertGroup(a.collaborator_id, 'docente', materia, a.id, a.lezione_id, a.valutazione ?? null);
        }
      } else {
        // cocoda: nessuno split per materia
        upsertGroup(a.collaborator_id, 'cocoda', null, a.id, a.lezione_id, a.valutazione ?? null);
      }
    }

    const entries: ValutazioneEntry[] = Array.from(groups.values()).map((g) => {
      const totalLezioni = g.ruolo === 'docente' && g.materia
        ? (lezioniPerMateria[g.materia] ?? 0)
        : totalCorsoLezioni;
      const assignedLezioni = g.assignedLezioniIds.size;
      const thresholdMet = g.ruolo === 'cocoda'
        ? true
        : totalLezioni > 0 && (assignedLezioni / totalLezioni) >= 0.8;

      return {
        collaborator_id: g.collaborator_id,
        nome: collabMap[g.collaborator_id]?.nome ?? '-',
        cognome: collabMap[g.collaborator_id]?.cognome ?? '',
        ruolo: g.ruolo,
        materia: g.materia,
        assegnazioniIds: g.assegnazioniIds,
        totalLezioni,
        assignedLezioni,
        thresholdMet,
        valutazione: g.valutazione,
      };
    });

    // Sort: cocoda first, then docente grouped by materia
    entries.sort((a, b) => {
      if (a.ruolo !== b.ruolo) return a.ruolo === 'cocoda' ? -1 : 1;
      if (a.materia !== b.materia) return (a.materia ?? '').localeCompare(b.materia ?? '');
      return `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`);
    });

    return {
      corso: { id: corso.id, nome: corso.nome, codice: corso.codice_identificativo },
      entries,
    };
  }).filter((cv: { entries: unknown[] }) => cv.entries.length > 0);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-foreground mb-1">Valutazione Corsi</h1>
      <p className="text-sm text-muted-foreground mb-6">Città: {cittaResp}</p>
      {corsiValutazioni.length === 0 ? (
        <EmptyState
          icon={Star}
          title="Nessuna assegnazione"
          description="Non ci sono ancora collaboratori assegnati ai corsi della tua citta."
        />
      ) : (
        <ValutazioniRespCittPage corsiValutazioni={corsiValutazioni} />
      )}
    </div>
  );
}
