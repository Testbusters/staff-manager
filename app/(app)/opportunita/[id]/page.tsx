import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Opportunity, OpportunityTipo } from '@/lib/types';
import RichTextDisplay from '@/components/ui/RichTextDisplay';

const TIPO_LABELS: Record<OpportunityTipo, string> = {
  LAVORO:     'Lavoro',
  FORMAZIONE: 'Formazione',
  STAGE:      'Stage',
  PROGETTO:   'Progetto',
  ALTRO:      'Altro',
};

const TIPO_COLORS: Record<OpportunityTipo, string> = {
  LAVORO:     'bg-green-900/30 border-green-800 text-green-400',
  FORMAZIONE: 'bg-blue-900/30 border-blue-800 text-blue-400',
  STAGE:      'bg-purple-900/30 border-purple-800 text-purple-400',
  PROGETTO:   'bg-amber-900/30 border-amber-800 text-amber-400',
  ALTRO:      'bg-gray-800 border-gray-700 text-gray-400',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active, member_status')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) redirect('/pending');
  if (profile.member_status === 'uscente_senza_compenso') redirect('/documenti');

  const { data: opp } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .single();

  if (!opp) notFound();

  const o = opp as Opportunity;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Link href="/opportunita" className="text-sm text-gray-500 hover:text-gray-300 transition">
        ← Torna alle opportunità
      </Link>

      <div className="space-y-2">
        <span className={`inline-block rounded-full border px-3 py-0.5 text-xs font-medium ${TIPO_COLORS[o.tipo as OpportunityTipo] ?? TIPO_COLORS.ALTRO}`}>
          {TIPO_LABELS[o.tipo as OpportunityTipo] ?? o.tipo}
        </span>
        <h1 className="text-2xl font-semibold text-gray-100">{o.titolo}</h1>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3">
        <div>
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Descrizione</h2>
          <RichTextDisplay html={o.descrizione} />
        </div>

        {o.requisiti && (
          <div className="border-t border-gray-800 pt-3">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Requisiti</h2>
            <RichTextDisplay html={o.requisiti} />
          </div>
        )}

        {o.scadenza_candidatura && (
          <div className="border-t border-gray-800 pt-3 flex items-center gap-2">
            <span className="text-gray-500">📅</span>
            <div>
              <p className="text-xs text-gray-500">Scadenza candidatura</p>
              <p className="text-sm text-gray-200">{formatDate(o.scadenza_candidatura)}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {o.link_candidatura && (
          <a href={o.link_candidatura} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-600 px-4 py-2 text-sm font-medium text-white transition">
            Candidati →
          </a>
        )}
        {o.file_url && (
          <a href={o.file_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm text-gray-200 transition">
            📎 Scarica allegato
          </a>
        )}
      </div>
    </div>
  );
}
