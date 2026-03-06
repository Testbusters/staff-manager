import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Briefcase, Tag } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/ui/empty-state';
import type { Opportunity, Discount, OpportunityTipo } from '@/lib/types';

type Tab = 'opportunita' | 'sconti' | 'sconti_peer4med';

const OPP_TIPO_LABELS: Record<OpportunityTipo, string> = {
  LAVORO:     'Lavoro',
  FORMAZIONE: 'Formazione',
  STAGE:      'Stage',
  PROGETTO:   'Progetto',
  ALTRO:      'Altro',
};

const OPP_TIPO_COLORS: Record<OpportunityTipo, string> = {
  LAVORO:     'bg-green-100 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400',
  FORMAZIONE: 'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400',
  STAGE:      'bg-purple-100 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400',
  PROGETTO:   'bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400',
  ALTRO:      'bg-muted border-border text-muted-foreground',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function expiryBadge(valid_to: string | null) {
  if (!valid_to) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(valid_to);
  const diffDays = Math.ceil((exp.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Scaduto</span>;
  if (diffDays <= 7) return <span className="rounded-full bg-yellow-100 border border-yellow-200 px-2 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/40 dark:border-yellow-700 dark:text-yellow-300">In scadenza</span>;
  return <span className="rounded-full bg-green-100 border border-green-200 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400">Attivo</span>;
}

export default async function OpportunitaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
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

  // Fetch user's community IDs for content filtering (collaboratori only)
  let userCommunityIds: string[] = [];
  if (profile.role === 'collaboratore') {
    const { data: collabRow } = await supabase
      .from('collaborators')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (collabRow?.id) {
      const { data: cc } = await supabase
        .from('collaborator_communities')
        .select('community_id')
        .eq('collaborator_id', collabRow.id);
      userCommunityIds = (cc ?? []).map((r: { community_id: string }) => r.community_id);
    }
  }

  const { tab } = await searchParams;
  const activeTab: Tab = tab === 'sconti' ? 'sconti'
    : tab === 'sconti_peer4med' ? 'sconti_peer4med'
    : 'opportunita';

  const allOpportunities: Opportunity[] = activeTab === 'opportunita'
    ? ((await supabase
        .from('opportunities')
        .select('id, titolo, tipo, descrizione, scadenza_candidatura, community_ids, created_at')
        .order('scadenza_candidatura', { ascending: true, nullsFirst: false })
        .then((r) => r.data ?? [])) as Opportunity[])
    : [];

  const opportunities = profile.role === 'collaboratore'
    ? allOpportunities.filter((o) =>
        o.community_ids.length === 0 || o.community_ids.some((id) => userCommunityIds.includes(id)))
    : allOpportunities;

  const allDiscounts: Discount[] = activeTab === 'sconti'
    ? ((await supabase
        .from('discounts')
        .select('id, titolo, fornitore, descrizione, valid_to, community_ids, brand, created_at')
        .eq('brand', 'testbusters')
        .order('created_at', { ascending: false })
        .then((r) => r.data ?? [])) as Discount[])
    : [];

  const discounts = profile.role === 'collaboratore'
    ? allDiscounts.filter((d) =>
        d.community_ids.length === 0 || d.community_ids.some((id) => userCommunityIds.includes(id)))
    : allDiscounts;

  const allDiscountsPeer4med: Discount[] = activeTab === 'sconti_peer4med'
    ? ((await supabase
        .from('discounts')
        .select('id, titolo, fornitore, descrizione, valid_to, community_ids, brand, created_at')
        .eq('brand', 'peer4med')
        .order('created_at', { ascending: false })
        .then((r) => r.data ?? [])) as Discount[])
    : [];

  const discountsPeer4med = profile.role === 'collaboratore'
    ? allDiscountsPeer4med.filter((d) =>
        d.community_ids.length === 0 || d.community_ids.some((id) => userCommunityIds.includes(id)))
    : allDiscountsPeer4med;

  const tabCls = (t: Tab) =>
    `whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
      activeTab === t
        ? 'bg-brand text-white'
        : 'bg-muted text-muted-foreground hover:bg-accent'
    }`;

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Opportunità e Sconti</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Opportunità aperte e agevolazioni per i collaboratori.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href="?tab=opportunita" className={tabCls('opportunita')}>💼 Opportunità</Link>
        <Link href="?tab=sconti" className={tabCls('sconti')}>🎁 Sconti</Link>
        <Link href="?tab=sconti_peer4med" className={tabCls('sconti_peer4med')}>🏥 Sconti Peer4Med</Link>
      </div>

      {activeTab === 'opportunita' && (
        <div className="space-y-3">
          {opportunities.length === 0 && (
            <EmptyState icon={Briefcase} title="Nessuna opportunità disponibile" description="Non ci sono opportunità pubblicate al momento." />
          )}
          {opportunities.map((o) => (
            <Link
              key={o.id}
              href={`/opportunita/${o.id}`}
              className="block rounded-xl border border-border bg-card p-4 hover:bg-muted/60 transition group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${OPP_TIPO_COLORS[o.tipo as OpportunityTipo] ?? OPP_TIPO_COLORS.ALTRO}`}>
                    {OPP_TIPO_LABELS[o.tipo as OpportunityTipo] ?? o.tipo}
                  </span>
                  <h3 className="text-sm font-semibold text-foreground truncate">{o.titolo}</h3>
                </div>
                <span className="flex-shrink-0 text-muted-foreground group-hover:text-foreground text-sm transition">→</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{o.descrizione}</p>
              {o.scadenza_candidatura && (
                <p className="text-xs text-muted-foreground mt-2">📅 Scadenza: {formatDate(o.scadenza_candidatura)}</p>
              )}
            </Link>
          ))}
        </div>
      )}

      {activeTab === 'sconti' && (
        <div className="space-y-3">
          {discounts.length === 0 && (
            <EmptyState icon={Tag} title="Nessuno sconto disponibile" description="Non ci sono sconti pubblicati al momento." />
          )}
          {discounts.map((d) => (
            <Link
              key={d.id}
              href={`/sconti/${d.id}`}
              className="block rounded-xl border border-border bg-card p-4 hover:bg-muted/60 transition group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {expiryBadge(d.valid_to)}
                  <h3 className="text-sm font-semibold text-foreground truncate">{d.titolo}</h3>
                  {d.fornitore && <span className="text-xs text-muted-foreground">· {d.fornitore}</span>}
                </div>
                <span className="flex-shrink-0 text-muted-foreground group-hover:text-foreground text-sm transition">→</span>
              </div>
              {d.descrizione && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.descrizione}</p>
              )}
            </Link>
          ))}
        </div>
      )}

      {activeTab === 'sconti_peer4med' && (
        <div className="space-y-3">
          {discountsPeer4med.length === 0 && (
            <EmptyState icon={Tag} title="Nessuno sconto Peer4Med disponibile" description="Non ci sono sconti Peer4Med pubblicati al momento." />
          )}
          {discountsPeer4med.map((d) => (
            <Link
              key={d.id}
              href={`/sconti/${d.id}`}
              className="block rounded-xl border border-border bg-card p-4 hover:bg-muted/60 transition group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {expiryBadge(d.valid_to)}
                  <h3 className="text-sm font-semibold text-foreground truncate">{d.titolo}</h3>
                  {d.fornitore && <span className="text-xs text-muted-foreground">· {d.fornitore}</span>}
                </div>
                <span className="flex-shrink-0 text-muted-foreground group-hover:text-foreground text-sm transition">→</span>
              </div>
              {d.descrizione && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.descrizione}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
