import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users, ChevronRight } from 'lucide-react';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { EmptyState } from '@/components/ui/empty-state';
import type { Role } from '@/lib/types';
import CollaboratoriSearchInput from '@/components/admin/CollaboratoriSearchInput';
import CollaboratorAvatar from '@/components/admin/CollaboratorAvatar';

const PAGE_SIZE = 20;

export default async function CollaboratoriPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: profile } = await svc
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) redirect('/pending');
  const role = profile?.role as Role;
  if (role !== 'amministrazione') redirect('/');

  const { q: queryParam, page: pageParam } = await searchParams;
  const q = queryParam?.trim().toLowerCase() ?? '';
  const page = Math.max(1, parseInt(pageParam ?? '1', 10));

  // ── Step 1: fetch user_ids with role = 'collaboratore' + tracking fields ──
  const { data: collabProfiles } = await svc
    .from('user_profiles')
    .select('user_id, invite_email_sent, onboarding_completed')
    .eq('role', 'collaboratore');

  const collabUserIds: string[] = [];
  const profileStatusMap = new Map<string, { inviteSent: boolean; onboardingDone: boolean }>();
  for (const p of (collabProfiles ?? []) as { user_id: string; invite_email_sent: boolean; onboarding_completed: boolean }[]) {
    collabUserIds.push(p.user_id);
    profileStatusMap.set(p.user_id, { inviteSent: p.invite_email_sent, onboardingDone: p.onboarding_completed });
  }

  if (collabUserIds.length === 0) {
    return (
      <div className="p-6">
        <header className="mb-8">
          <h1 className="text-xl font-semibold text-foreground">Collaboratori</h1>
        </header>
        <CollaboratoriSearchInput defaultValue={q} />
        <div className="mt-8">
          <EmptyState icon={Users} title="Nessun collaboratore presente." />
        </div>
      </div>
    );
  }

  // ── Step 2: fetch collaborators ───────────────────────────────────────────
  type CollabRow = {
    id: string;
    user_id: string | null;
    nome: string | null;
    cognome: string | null;
    email: string | null;
    username: string | null;
    codice_fiscale: string | null;
    tipo_contratto: string | null;
    telefono: string | null;
  };

  const { data: allCollabs } = await svc
    .from('collaborators')
    .select('id, user_id, nome, cognome, email, username, codice_fiscale, tipo_contratto, telefono')
    .in('user_id', collabUserIds);

  // ── Step 3: text search filter ────────────────────────────────────────────
  let filtered: CollabRow[] = ((allCollabs ?? []) as CollabRow[]).sort((a, b) =>
    (a.cognome ?? '').localeCompare(b.cognome ?? '', 'it'),
  );

  if (q) {
    filtered = filtered.filter((c) =>
      [c.nome, c.cognome, c.username, c.email].some((val) =>
        val?.toLowerCase().includes(q),
      ),
    );
  }

  // ── Step 4: paginate ──────────────────────────────────────────────────────
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ── Step 5: fetch community data for page ─────────────────────────────────
  const pageIds = pageItems.map((c) => c.id);
  let communityByCollab: Record<string, string[]> = {};

  if (pageIds.length > 0) {
    const { data: ccData } = await svc
      .from('collaborator_communities')
      .select('collaborator_id, community_id')
      .in('collaborator_id', pageIds);

    const communityIds = [...new Set((ccData ?? []).map((cc: { community_id: string }) => cc.community_id))];
    let nameById: Record<string, string> = {};
    if (communityIds.length > 0) {
      const { data: comm } = await svc
        .from('communities')
        .select('id, name')
        .in('id', communityIds);
      nameById = Object.fromEntries(
        (comm ?? []).map((c: { id: string; name: string }) => [c.id, c.name]),
      );
    }
    for (const cc of (ccData ?? []) as { collaborator_id: string; community_id: string }[]) {
      if (!communityByCollab[cc.collaborator_id]) communityByCollab[cc.collaborator_id] = [];
      if (nameById[cc.community_id]) communityByCollab[cc.collaborator_id].push(nameById[cc.community_id]);
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <header className="mb-6 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-foreground">Collaboratori</h1>
        <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full bg-brand/15 text-brand text-xs font-semibold tabular-nums">
          {total}
        </span>
      </header>

      {/* Search */}
      <div className="mb-5">
        <CollaboratoriSearchInput defaultValue={q} />
      </div>

      {/* List */}
      {pageItems.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nessun collaboratore trovato"
          description={q ? `Nessun risultato per "${queryParam}".` : undefined}
        />
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden mb-4">
          {pageItems.map((c) => {
            const communities = communityByCollab[c.id] ?? [];

            return (
              <Link
                key={c.id}
                href={`/collaboratori/${c.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/60 transition cursor-pointer group"
              >
                {/* Avatar */}
                <CollaboratorAvatar
                  userId={c.user_id}
                  nome={c.nome}
                  cognome={c.cognome}
                  size="sm"
                />

                {/* Nome + username */}
                <div className="w-52 shrink-0 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-foreground leading-tight">
                      {[c.nome, c.cognome].filter(Boolean).join(' ') || '—'}
                    </span>
                    {c.username && (
                      <span className="text-xs font-mono bg-indigo-950/60 text-indigo-300 border border-indigo-700/30 px-1.5 py-0.5 rounded-full">
                        @{c.username}
                      </span>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-muted-foreground truncate block">
                    {c.email ?? '—'}
                  </span>
                </div>

                {/* Tipo contratto */}
                <div className="w-28 shrink-0 hidden md:block">
                  {c.tipo_contratto ? (
                    <span className="text-xs font-medium uppercase tracking-wide bg-muted text-muted-foreground px-2 py-0.5 rounded">
                      {c.tipo_contratto}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </div>

                {/* Telefono */}
                <div className="w-36 shrink-0 hidden lg:block">
                  <span className="text-xs text-muted-foreground">
                    {c.telefono ?? '—'}
                  </span>
                </div>

                {/* Communities */}
                <div className="hidden sm:flex items-center justify-end gap-1.5 w-44 shrink-0">
                  {communities.length === 0 ? (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  ) : (
                    communities.map((name) => (
                      <span
                        key={name}
                        className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
                      >
                        {name}
                      </span>
                    ))
                  )}
                </div>

                {/* Mail invito */}
                <div className="hidden lg:block w-24 shrink-0">
                  {profileStatusMap.get(c.user_id!)?.inviteSent ? (
                    <span className="text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                      Inviata
                    </span>
                  ) : (
                    <span className="text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/25 px-2 py-0.5 rounded-full">
                      Non inviata
                    </span>
                  )}
                </div>

                {/* Attivazione profilo */}
                <div className="hidden lg:block w-28 shrink-0">
                  {profileStatusMap.get(c.user_id!)?.onboardingDone ? (
                    <span className="text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                      Completato
                    </span>
                  ) : (
                    <span className="text-xs font-medium bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full">
                      In attesa
                    </span>
                  )}
                </div>

                {/* Arrow */}
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition shrink-0" />
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {total} collaborator{total !== 1 ? 'i' : 'e'} · pagina {safePage} di {totalPages}
          </span>
          <div className="flex gap-2">
            {safePage > 1 && (
              <Link
                href={`/collaboratori?${q ? `q=${encodeURIComponent(q)}&` : ''}page=${safePage - 1}`}
                className="px-3 py-1.5 rounded-md text-xs bg-muted text-foreground hover:bg-accent transition"
              >
                ← Precedente
              </Link>
            )}
            {safePage < totalPages && (
              <Link
                href={`/collaboratori?${q ? `q=${encodeURIComponent(q)}&` : ''}page=${safePage + 1}`}
                className="px-3 py-1.5 rounded-md text-xs bg-muted text-foreground hover:bg-accent transition"
              >
                Successiva →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
