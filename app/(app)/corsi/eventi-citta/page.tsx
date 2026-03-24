import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import EventiCittaPage from '@/components/corsi/EventiCittaPage';
import type { ContentEvent } from '@/lib/types';

export default async function EventiCittaRoute() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active, citta_responsabile')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active || profile.role !== 'responsabile_cittadino') notFound();
  if (!profile.citta_responsabile) {
    // No city configured — show empty page, component will show empty state
  }

  const citta: string = profile.citta_responsabile ?? '';

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: events } = citta
    ? await serviceClient
        .from('events')
        .select('id, titolo, descrizione, start_datetime, end_datetime, location, luma_url, luma_embed_url, tipo, community_ids, file_url, created_at, citta')
        .eq('citta', citta)
        .order('start_datetime', { ascending: true, nullsFirst: false })
    : { data: [] };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link
        href="/corsi/assegnazione"
        className="inline-flex items-center gap-1.5 text-sm text-link hover:text-link/80"
      >
        <ArrowLeft className="h-4 w-4" />
        Torna ai corsi
      </Link>

      <EventiCittaPage
        initialEvents={(events ?? []) as ContentEvent[]}
        citta={citta}
      />
    </div>
  );
}
