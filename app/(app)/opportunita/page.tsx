import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Briefcase, Tag, CalendarDays } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/ui/empty-state';
import type { Opportunity, Discount, OpportunityTipo } from '@/lib/types';

type Tab = 'opportunita' | 'sconti' | 'sconti_peer4med';

const PAGE_SIZE = 20;

const OPP_TIPO_LABELS: Record<OpportunityTipo, string> = {
  VOLONTARIATO: 'Volontariato',
  FORMAZIONE:   'Formazione',
  LAVORO:       'Lavoro',
  ALTRO:        'Altro',
};

const OPP_TIPO_COLORS: Record<OpportunityTipo, string> = {
  VOLONTARIATO: 'bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400',
  FORMAZIONE:   'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400',
  LAVORO:       'bg-green-100 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400',
  ALTRO:        'bg-muted border-border text-muted-foreground',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function isActive(d: Discount): boolean {
  if (!d.valid_to) return true;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(d.valid_to) >= today;
}

function expiryBadge(valid_to: string | null) {
  if (!valid_to) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((new Date(valid_to).getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Scaduto</span>;
  if (diffDays <= 7) return <span className="rounded-full bg-yellow-100 border border-yellow-200 px-2 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/40 dark:border-yellow-700 dark:text-yellow-300">In scadenza</span>;
  return <span className="rounded-full bg-green-100 border border-green-200 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400">Attivo</span>;
}

function PaginationNav({ page, totalPages, makeUrl }: {
  page: number; totalPages: number; makeUrl: (p: number) => string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 border-t border-border">
      <span className="text-xs text-muted-foreground">Pagina {page} di {totalPages}</span>
      <div className="flex gap-2">
        {page > 1
          ? <a href={makeUrl(page - 1)} className="rounded-lg border border-border bg-muted hover:bg-accent px-3 py-1.5 text-xs text-foreground transition" aria-label="Pagina precedente">← Precedente</a>
          : <span className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground/40 select-none">← Precedente</span>
        }
        {page < totalPages
          ? <a href={makeUrl(page + 1)} className="rounded-lg border border-border bg-muted hover:bg-accent px-3 py-1.5 text-xs text-foreground transition" aria-label="Pagina successiva">Successivo →</a>
          : <span className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground/40 select-none">Successivo →</span>
        }
      </div>
    </div>
  );
}

function DiscountSection({ discounts, tab, page }: { discounts: Discount[]; tab: Tab; page: number }) {
  const active = discounts.filter(isActive);
  const expired = discounts.filter((d) => !isActive(d));
  const sorted = [...active, ...expired];
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageActive = pageItems.filter(isActive);
  const pageExpired = pageItems.filter((d) => !isActive(d));

  return (
    <div className="space-y-4">
      {pageActive.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Attivi</h2>
          {pageActive.map((d) => (
            <Link key={d.id} href={`/sconti/${d.id}`}
              className="block rounded-xl border border-border bg-card p-4 hover:bg-muted/60 transition group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {expiryBadge(d.valid_to)}
                  <h3 className="text-sm font-semibold text-foreground truncate">{d.titolo}</h3>
                  {d.fornitore && <span className="text-xs text-muted-foreground">· {d.fornitore}</span>}
                </div>
                <span className="flex-shrink-0 text-muted-foreground group-hover:text-foreground text-sm transition">→</span>
              </div>
              {d.descrizione && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{stripHtml(d.descrizione)}</p>}
            </Link>
          ))}
        </div>
      )}
      {pageExpired.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Scaduti</h2>
          {pageExpired.map((d) => (
            <Link key={d.id} href={`/sconti/${d.id}`}
              className="block rounded-xl border border-border bg-card/50 p-4 hover:bg-muted/60 transition group opacity-70">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {expiryBadge(d.valid_to)}
                  <h3 className="text-sm font-semibold text-muted-foreground truncate">{d.titolo}</h3>
                  {d.fornitore && <span className="text-xs text-muted-foreground">· {d.fornitore}</span>}
                </div>
                <span className="flex-shrink-0 text-muted-foreground group-hover:text-foreground text-sm transition">→</span>
              </div>
              {d.descrizione && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{stripHtml(d.descrizione)}</p>}
            </Link>
          ))}
        </div>
      )}
      <PaginationNav page={page} totalPages={totalPages} makeUrl={(p) => `?tab=${tab}&page=${p}`} />
    </div>
  );
}

export default async function OpportunitaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
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

  const params = await searchParams;
  const activeTab: Tab = params.tab === 'sconti' ? 'sconti'
    : params.tab === 'sconti_peer4med' ? 'sconti_peer4med'
    : 'opportunita';
  const page = Math.max(1, parseInt(params.page ?? '1'));

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

  const oppTotalPages = Math.ceil(opportunities.length / PAGE_SIZE);
  const pageOpportunities = opportunities.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
        <Link href="?tab=opportunita" className={tabCls('opportunita')}><span className="inline-flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />Opportunità</span></Link>
        <Link href="?tab=sconti" className={tabCls('sconti')}><span className="inline-flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />Sconti</span></Link>
        <Link href="?tab=sconti_peer4med" className={tabCls('sconti_peer4med')}><span className="inline-flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />Sconti Peer4Med</span></Link>
      </div>

      {activeTab === 'opportunita' && (
        <div className="space-y-3">
          {opportunities.length === 0 && (
            <EmptyState icon={Briefcase} title="Nessuna opportunità disponibile" description="Non ci sono opportunità pubblicate al momento." />
          )}
          {pageOpportunities.map((o) => (
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
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{stripHtml(o.descrizione)}</p>
              {o.scadenza_candidatura && (
                <p className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-2.5"><CalendarDays className="h-3.5 w-3.5 shrink-0" />Scadenza: {formatDate(o.scadenza_candidatura)}</p>
              )}
            </Link>
          ))}
          <PaginationNav page={page} totalPages={oppTotalPages} makeUrl={(p) => `?tab=opportunita&page=${p}`} />
        </div>
      )}

      {activeTab === 'sconti' && (
        <div className="space-y-3">
          {discounts.length === 0 && (
            <EmptyState icon={Tag} title="Nessuno sconto disponibile" description="Non ci sono sconti pubblicati al momento." />
          )}
          {discounts.length > 0 && <DiscountSection discounts={discounts} tab="sconti" page={page} />}
        </div>
      )}

      {activeTab === 'sconti_peer4med' && (
        <div className="space-y-3">
          {discountsPeer4med.length === 0 && (
            <EmptyState icon={Tag} title="Nessuno sconto Peer4Med disponibile" description="Non ci sono sconti Peer4Med pubblicati al momento." />
          )}
          {discountsPeer4med.length > 0 && <DiscountSection discounts={discountsPeer4med} tab="sconti_peer4med" page={page} />}
        </div>
      )}
    </div>
  );
}
