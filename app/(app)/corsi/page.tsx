import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { GraduationCap } from 'lucide-react';
import { getCorsoStato } from '@/lib/corsi-utils';
import { CORSO_STATO_LABELS } from '@/lib/types';
import type { CorsoStato } from '@/lib/types';
import CorsiFilterBar from '@/components/corsi/CorsiFilterBar';
import CorsiPageCollab from '@/components/corsi/CorsiPageCollab';

const STATO_BADGE: Record<CorsoStato, string> = {
  programmato: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  attivo: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  concluso: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default async function CorsiPage({
  searchParams,
}: {
  searchParams: Promise<{ community?: string; stato?: string; q?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) redirect('/pending');
  const role = profile.role as string;

  // collaboratore → 3-section view with calendar
  if (role === 'collaboratore') {
    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: collabRow } = await svc
      .from('collaborators')
      .select('id, citta')
      .eq('user_id', user.id)
      .single();

    const { data: collabComm } = collabRow
      ? await svc.from('collaborator_communities').select('community_id').eq('collaborator_id', collabRow.id).single()
      : { data: null };

    if (!collabComm?.community_id) {
      return (
        <div className="p-6">
          <EmptyState
            icon={GraduationCap}
            title="Nessun corso disponibile"
            description="Non sei ancora associato a una community."
          />
        </div>
      );
    }

    const communityId = collabComm.community_id;

    const [{ data: community }, { data: corsiComunitaRaw }, { data: assegnazioniRaw }] = await Promise.all([
      svc.from('communities').select('name').eq('id', communityId).single(),
      svc.from('corsi').select('id, nome, codice_identificativo, modalita, citta, data_inizio, data_fine')
        .eq('community_id', communityId).order('data_inizio', { ascending: true }),
      collabRow?.id
        ? svc.from('assegnazioni').select('lezione_id, ruolo').eq('collaborator_id', collabRow.id)
        : Promise.resolve({ data: [] as { lezione_id: string; ruolo: string }[] }),
    ]);

    const corsiComunita = (corsiComunitaRaw ?? [])
      .map((c) => ({ ...c, stato: getCorsoStato(c.data_inizio, c.data_fine) as CorsoStato }))
      .filter((c) => c.stato !== 'concluso');

    // Fetch lezioni + corsi for assigned lezioni (calendar + section 1)
    const lezioneIds = [...new Set((assegnazioniRaw ?? []).map((a) => a.lezione_id))];
    const [{ data: lezioniRaw }] = await Promise.all([
      lezioneIds.length > 0
        ? svc.from('lezioni').select('id, corso_id, data, orario_inizio').in('id', lezioneIds)
        : Promise.resolve({ data: [] as { id: string; corso_id: string; data: string; orario_inizio: string }[] }),
    ]);

    const corsiAssegnatiIds = [...new Set((lezioniRaw ?? []).map((l) => l.corso_id))];
    const { data: corsiAssegnatiRaw } = corsiAssegnatiIds.length > 0
      ? await svc.from('corsi').select('id, nome, codice_identificativo, modalita, citta, data_inizio, data_fine').in('id', corsiAssegnatiIds)
      : { data: [] as typeof corsiComunitaRaw };

    const corsiAssegnati = (corsiAssegnatiRaw ?? []).map((c) => ({
      ...c,
      stato: getCorsoStato(c.data_inizio, c.data_fine) as CorsoStato,
    }));

    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Corsi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {community?.name ?? 'La tua community'}
          </p>
        </div>
        <CorsiPageCollab
          communityName={community?.name ?? ''}
          collabCitta={collabRow?.citta ?? null}
          corsiAssegnati={corsiAssegnati}
          corsiComunita={corsiComunita}
          assegnazioni={assegnazioniRaw ?? []}
          lezioni={lezioniRaw ?? []}
        />
      </div>
    );
  }

  if (role === 'responsabile_cittadino') redirect('/corsi/assegnazione');

  if (role !== 'amministrazione') redirect('/');

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { community: communityFilter, stato: statoFilter, q } = await searchParams;

  const [{ data: corsiRaw }, { data: communities }, { data: lezioniCounts }] = await Promise.all([
    svc.from('corsi').select('*, community:communities(id, name)').order('data_inizio', { ascending: false }),
    svc.from('communities').select('id, name').eq('is_active', true).order('name'),
    svc.from('lezioni').select('corso_id'),
  ]);

  const countMap = new Map<string, number>();
  for (const l of lezioniCounts ?? []) {
    countMap.set(l.corso_id, (countMap.get(l.corso_id) ?? 0) + 1);
  }

  let corsi = (corsiRaw ?? []).map((c) => ({
    ...c,
    stato: getCorsoStato(c.data_inizio, c.data_fine) as CorsoStato,
    lezioni_count: countMap.get(c.id) ?? 0,
    community: c.community as { id: string; name: string } | null,
  }));

  if (communityFilter) corsi = corsi.filter((c) => c.community_id === communityFilter);
  if (statoFilter) corsi = corsi.filter((c) => c.stato === statoFilter);
  if (q) {
    const lower = q.toLowerCase();
    corsi = corsi.filter(
      (c) =>
        c.nome.toLowerCase().includes(lower) ||
        c.codice_identificativo.toLowerCase().includes(lower),
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Corsi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestisci i corsi e le lezioni per ogni community.
          </p>
        </div>
        <Link href="/corsi/nuovo">
          <Button className="bg-brand hover:bg-brand/90 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Nuovo corso
          </Button>
        </Link>
      </div>

      <CorsiFilterBar communities={(communities ?? []) as { id: string; name: string }[]} />

      {corsi.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Nessun corso trovato"
          description="Crea il primo corso con il pulsante in alto a destra."
        />
      ) : (
        <div className="rounded-2xl bg-card border border-border overflow-hidden w-fit">
          <Table className="w-auto">
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Community</TableHead>
                <TableHead>Città</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Lezioni</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {corsi.map((corso) => (
                <TableRow key={corso.id} className="hover:bg-muted/60 cursor-pointer">
                  <TableCell className="font-mono text-xs">{corso.codice_identificativo}</TableCell>
                  <TableCell className="font-medium">{corso.nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{corso.community?.name ?? '—'}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {corso.citta ?? <span className="italic text-xs">candidatura aperta</span>}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATO_BADGE[corso.stato as CorsoStato]}`}>
                      {CORSO_STATO_LABELS[corso.stato as CorsoStato]}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{corso.lezioni_count}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {corso.data_inizio} → {corso.data_fine}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/corsi/${corso.id}`}
                      className="text-link hover:text-link/80 text-sm"
                    >
                      Apri
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
