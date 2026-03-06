import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Megaphone, Tag, BookOpen, CalendarDays, Briefcase } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import CommunicationList from '@/components/contenuti/CommunicationList';
import DiscountList from '@/components/contenuti/DiscountList';
import ResourceList from '@/components/contenuti/ResourceList';
import EventList from '@/components/contenuti/EventList';
import OpportunityList from '@/components/contenuti/OpportunityList';
import type { Role, Communication, Discount, Resource, ContentEvent, Opportunity, Community } from '@/lib/types';

type Tab = 'comunicazioni' | 'sconti' | 'sconti_peer4med' | 'risorse' | 'eventi' | 'opportunita';

export default async function ContenutiPage({
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

  const role = profile.role as Role;
  if (role === 'collaboratore' && profile.member_status === 'uscente_senza_compenso') redirect('/documenti');

  // Only admin can access this admin-facing content management page
  if (role !== 'amministrazione') redirect('/');

  const { tab } = await searchParams;
  const activeTab: Tab = tab === 'sconti' ? 'sconti'
    : tab === 'sconti_peer4med' ? 'sconti_peer4med'
    : tab === 'risorse' ? 'risorse'
    : tab === 'eventi' ? 'eventi'
    : tab === 'opportunita' ? 'opportunita'
    : 'comunicazioni';

  // Always fetch communities (needed by forms)
  const { data: communities } = await supabase
    .from('communities')
    .select('id, name')
    .order('name', { ascending: true });

  const comms: Community[] = (communities ?? []) as Community[];

  const communications: Communication[] = activeTab === 'comunicazioni'
    ? ((await supabase
        .from('communications')
        .select('*')
        .order('pinned', { ascending: false })
        .order('published_at', { ascending: false })
        .then((r) => r.data ?? [])) as Communication[])
    : [];

  const discounts: Discount[] = activeTab === 'sconti'
    ? ((await supabase
        .from('discounts')
        .select('*')
        .eq('brand', 'testbusters')
        .order('created_at', { ascending: false })
        .then((r) => r.data ?? [])) as Discount[])
    : [];

  const discountsPeer4med: Discount[] = activeTab === 'sconti_peer4med'
    ? ((await supabase
        .from('discounts')
        .select('*')
        .eq('brand', 'peer4med')
        .order('created_at', { ascending: false })
        .then((r) => r.data ?? [])) as Discount[])
    : [];

  const resources: Resource[] = activeTab === 'risorse'
    ? ((await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false })
        .then((r) => r.data ?? [])) as Resource[])
    : [];

  const events: ContentEvent[] = activeTab === 'eventi'
    ? ((await supabase
        .from('events')
        .select('*')
        .order('start_datetime', { ascending: true, nullsFirst: false })
        .then((r) => r.data ?? [])) as ContentEvent[])
    : [];

  const opportunities: Opportunity[] = activeTab === 'opportunita'
    ? ((await supabase
        .from('opportunities')
        .select('*')
        .order('created_at', { ascending: false })
        .then((r) => r.data ?? [])) as Opportunity[])
    : [];

  const tabCls = (t: Tab) =>
    `whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
      activeTab === t
        ? 'bg-brand text-white'
        : 'bg-muted text-muted-foreground hover:bg-accent'
    }`;

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Contenuti</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gestione comunicazioni, sconti, risorse, eventi e opportunità.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <Link href="?tab=comunicazioni" className={tabCls('comunicazioni')}><span className="inline-flex items-center gap-1.5"><Megaphone className="h-3.5 w-3.5" />Comunicazioni</span></Link>
        <Link href="?tab=sconti" className={tabCls('sconti')}><span className="inline-flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />Sconti</span></Link>
        <Link href="?tab=sconti_peer4med" className={tabCls('sconti_peer4med')}><span className="inline-flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />Sconti Peer4Med</span></Link>
        <Link href="?tab=risorse" className={tabCls('risorse')}><span className="inline-flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />Risorse</span></Link>
        <Link href="?tab=eventi" className={tabCls('eventi')}><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Eventi</span></Link>
        <Link href="?tab=opportunita" className={tabCls('opportunita')}><span className="inline-flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />Opportunità</span></Link>
      </div>

      {activeTab === 'comunicazioni' && (
        <CommunicationList
          communications={communications}
          canWrite={true}
          communities={comms}
        />
      )}
      {activeTab === 'sconti' && (
        <DiscountList
          discounts={discounts}
          canWrite={true}
          communities={comms}
          brand="testbusters"
        />
      )}
      {activeTab === 'sconti_peer4med' && (
        <DiscountList
          discounts={discountsPeer4med}
          canWrite={true}
          communities={comms}
          brand="peer4med"
        />
      )}
      {activeTab === 'risorse' && (
        <ResourceList
          resources={resources}
          canWrite={true}
          communities={comms}
        />
      )}
      {activeTab === 'eventi' && (
        <EventList
          events={events}
          canWrite={true}
          communities={comms}
        />
      )}
      {activeTab === 'opportunita' && (
        <OpportunityList
          opportunities={opportunities}
          canWrite={true}
          communities={comms}
        />
      )}
    </div>
  );
}
