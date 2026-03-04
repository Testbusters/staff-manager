import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import TicketList from '@/components/ticket/TicketList';
import TicketRecordRow from '@/components/ticket/TicketRecordRow';
import type { TicketRecord } from '@/components/ticket/TicketRecordRow';
import type { Role } from '@/lib/types';

export default async function TicketPage() {
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

  const isManager = ['amministrazione', 'responsabile_compensi'].includes(role);

  // ── Manager view ────────────────────────────────────────────────────────────
  if (isManager) {
    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const threeAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    type RTicket = {
      id: string;
      oggetto: string;
      stato: string;
      categoria: string;
      priority: string;
      creator_user_id: string;
      created_at: string;
      updated_at: string;
      last_message_at: string | null;
      last_message_author_name: string | null;
    };

    const [{ data: rawRicevuti }, { data: rawRecenti }] = await Promise.all([
      svc
        .from('tickets')
        .select('id, oggetto, stato, categoria, priority, creator_user_id, created_at, updated_at, last_message_at, last_message_author_name')
        .in('stato', ['APERTO', 'IN_LAVORAZIONE'])
        .order('created_at', { ascending: false }),
      svc
        .from('tickets')
        .select('id, oggetto, stato, categoria, priority, creator_user_id, created_at, updated_at, last_message_at, last_message_author_name')
        .gte('updated_at', threeAgo)
        .order('updated_at', { ascending: false })
        .limit(30),
    ]);

    // Enrich with creator names
    const allRicevuti = (rawRicevuti ?? []) as RTicket[];
    const allRecenti  = (rawRecenti  ?? []) as RTicket[];
    const creatorIds  = [...new Set([
      ...allRicevuti.map(t => t.creator_user_id),
      ...allRecenti.map(t => t.creator_user_id),
    ].filter(Boolean))];

    let nameMap: Record<string, string> = {};
    if (creatorIds.length > 0) {
      const { data: collabs } = await svc
        .from('collaborators')
        .select('user_id, nome, cognome')
        .in('user_id', creatorIds);
      nameMap = Object.fromEntries(
        (collabs ?? []).map((c) => [c.user_id, `${c.nome ?? ''} ${c.cognome ?? ''}`.trim()]),
      );
    }

    const toRecord = (t: RTicket): TicketRecord => ({
      id: t.id,
      oggetto: t.oggetto,
      stato: t.stato as TicketRecord['stato'],
      categoria: t.categoria,
      priority: t.priority,
      creator_name: nameMap[t.creator_user_id] ?? null,
      last_message_at: t.last_message_at,
      last_message_author_name: t.last_message_author_name,
    });

    const ricevuti = allRicevuti.map(toRecord);
    const recenti  = allRecenti.map(toRecord);

    return (
      <div className="p-6 max-w-5xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Ticket</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestione ticket aperti dai collaboratori.</p>
        </div>

        {/* Ticket ricevuti */}
        <div>
          <h2 className="text-sm font-medium text-gray-400 mb-2">Ticket ricevuti</h2>
          {ricevuti.length === 0 ? (
            <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 text-center">
              <p className="text-sm text-gray-500">Nessun ticket aperto.</p>
            </div>
          ) : (
            <div className="rounded-xl bg-gray-900 border border-gray-800 divide-y divide-gray-800">
              {ricevuti.map((t) => <TicketRecordRow key={t.id} ticket={t} />)}
            </div>
          )}
        </div>

        {/* Ticket recenti */}
        <div>
          <h2 className="text-sm font-medium text-gray-400 mb-2">Ticket recenti <span className="text-gray-600 font-normal">(ultimi 3 giorni)</span></h2>
          {recenti.length === 0 ? (
            <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 text-center">
              <p className="text-sm text-gray-500">Nessun ticket con attività recente.</p>
            </div>
          ) : (
            <div className="rounded-xl bg-gray-900 border border-gray-800 divide-y divide-gray-800">
              {recenti.map((t) => <TicketRecordRow key={t.id} ticket={t} />)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Collaboratore view ──────────────────────────────────────────────────────
  const { data: rawTickets } = await supabase
    .from('tickets')
    .select('id, oggetto, stato, categoria, priority, created_at')
    .eq('creator_user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-100">I tuoi ticket</h1>
        <p className="text-sm text-gray-500 mt-0.5">Le tue richieste di supporto.</p>
      </div>
      <TicketList
        tickets={(rawTickets ?? []) as Parameters<typeof TicketList>[0]['tickets']}
        role={role}
      />
    </div>
  );
}
