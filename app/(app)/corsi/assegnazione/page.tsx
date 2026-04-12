import { redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AssegnazioneRespCittPage from '@/components/corsi/AssegnazioneRespCittPage';

export default async function CorsiAssegnazionePage() {
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

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [{ data: corsiDisponibili }, { data: mieicitta_corsi }] = await Promise.all([
    svc.from('corsi').select('id, nome, codice_identificativo, modalita, data_inizio, data_fine').is('citta', null).order('data_inizio', { ascending: true }),
    cittaResp
      ? svc.from('corsi').select('id, nome, codice_identificativo, modalita, data_inizio, data_fine, citta, max_qa_per_lezione, max_docenti_per_lezione').eq('citta', cittaResp).order('data_inizio', { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  // Fetch own citta_corso candidature
  const { data: ownCandidature } = await svc
    .from('candidature')
    .select('id, corso_id, stato')
    .eq('city_user_id', user.id)
    .eq('tipo', 'citta_corso')
    .neq('stato', 'ritirata');

  // Fetch lezioni for miei corsi + collabs for CoCoD'à assignment
  const mieiCorsiIds = (mieicitta_corsi ?? []).map((c: { id: string }) => c.id);
  const [{ data: mieiCorsiLezioni }, { data: collabsPerCocoda }] = await Promise.all([
    mieiCorsiIds.length > 0
      ? svc.from('lezioni').select('id, corso_id, data, orario_inizio, orario_fine, materia').in('corso_id', mieiCorsiIds).order('data').order('orario_inizio')
      : Promise.resolve({ data: [] }),
    cittaResp
      ? svc.from('collaborators').select('id, nome, cognome, username').eq('citta', cittaResp).order('cognome')
      : Promise.resolve({ data: [] }),
  ]);

  // Fetch existing assegnazioni for miei corsi lezioni + blacklist
  const lezioniIds = (mieiCorsiLezioni ?? []).map((l: { id: string }) => l.id);
  const [cocodaResult, qaResult, blacklistResult] = await Promise.all([
    lezioniIds.length > 0
      ? svc.from('assegnazioni').select('id, lezione_id, collaborator_id').in('lezione_id', lezioniIds).eq('ruolo', 'cocoda')
      : Promise.resolve({ data: [] as { id: string; lezione_id: string; collaborator_id: string }[] }),
    lezioniIds.length > 0
      ? svc.from('assegnazioni').select('id, lezione_id, collaborator_id').in('lezione_id', lezioniIds).eq('ruolo', 'qa')
      : Promise.resolve({ data: [] as { id: string; lezione_id: string; collaborator_id: string }[] }),
    svc.from('blacklist').select('collaborator_id'),
  ]);
  const cocodaAssegnazioni = cocodaResult.data;
  const qaAssegnazioni = qaResult.data;
  const blacklistedIds = new Set((blacklistResult.data ?? []).map((b: { collaborator_id: string }) => b.collaborator_id));

  // Compute maxQAPerCorso from miei corsi data
  const maxQAPerCorso: Record<string, number> = {};
  for (const c of mieicitta_corsi ?? []) {
    maxQAPerCorso[c.id] = (c as { max_qa_per_lezione: number }).max_qa_per_lezione ?? 0;
  }

  if (!cittaResp) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-foreground mb-4">Candidatura e Assegnazione</h1>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            La tua città di responsabilità non è ancora stata configurata. Contatta l&apos;amministrazione.
          </AlertDescription>
        </Alert>
        {(corsiDisponibili ?? []).length > 0 && (
          <div className="mt-6">
            <AssegnazioneRespCittPage
              corsiDisponibili={corsiDisponibili ?? []}
              mieiCorsi={[]}
              ownCandidature={ownCandidature ?? []}
              cittaResp={null}
              mieiCorsiLezioni={[]}
              collabsPerCocoda={[]}
              cocodaAssegnazioni={[]}
              qaAssegnazioni={[]}
              blacklistedIds={blacklistedIds}
              maxQAPerCorso={{}}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-foreground mb-1">Candidatura e Assegnazione</h1>
      <p className="text-sm text-muted-foreground mb-6">Città: {cittaResp}</p>
      <AssegnazioneRespCittPage
        corsiDisponibili={corsiDisponibili ?? []}
        mieiCorsi={mieicitta_corsi ?? []}
        ownCandidature={ownCandidature ?? []}
        cittaResp={cittaResp}
        mieiCorsiLezioni={mieiCorsiLezioni ?? []}
        collabsPerCocoda={collabsPerCocoda ?? []}
        cocodaAssegnazioni={cocodaAssegnazioni ?? []}
        qaAssegnazioni={qaAssegnazioni ?? []}
        blacklistedIds={blacklistedIds}
        maxQAPerCorso={maxQAPerCorso}
      />
    </div>
  );
}
