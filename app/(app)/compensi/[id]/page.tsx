import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CompensationDetail from '@/components/compensation/CompensationDetail';
import Timeline from '@/components/compensation/Timeline';
import ActionPanel from '@/components/compensation/ActionPanel';
import type { Role, CompensationStatus } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

export default async function CompensationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
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

  const { id } = await params;

  // Fetch compensation (RLS ensures only authorized users can read it)
  const { data: compensation, error } = await supabase
    .from('compensations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !compensation) notFound();

  const role = profile.role as Role;

  // Fetch compensation history
  const { data: history } = await supabase
    .from('compensation_history')
    .select('*')
    .eq('compensation_id', id)
    .order('created_at', { ascending: true });

  // Fetch competenza label (if set)
  let competenzaLabel: string | null = null;
  if (compensation.competenza) {
    const { data: competenzaRow } = await supabase
      .from('compensation_competenze')
      .select('label')
      .eq('key', compensation.competenza)
      .single();
    competenzaLabel = competenzaRow?.label ?? null;
  }

  // Fetch collaborator info — only for responsabile_compensi and amministrazione
  let collaborator: { nome: string | null; cognome: string | null; username: string | null } | null = null;
  if (role === 'responsabile_compensi' || role === 'amministrazione') {
    const { data: collabRow } = await supabase
      .from('collaborators')
      .select('nome, cognome, username')
      .eq('id', compensation.collaborator_id)
      .single();
    collaborator = collabRow ?? null;
  }

  const backHref = role === 'collaboratore' ? '/compensi' : role === 'responsabile_compensi' ? '/approvazioni' : '/coda';
  const backLabel = role === 'collaboratore' ? 'Compensi' : role === 'responsabile_compensi' ? 'Approvazioni' : 'Coda';

  return (
    <div className="p-6 max-w-2xl">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={backHref}>{backLabel}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Dettaglio compenso</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="space-y-6">
        <CompensationDetail
          compensation={compensation}
          competenzaLabel={competenzaLabel}
          collaborator={collaborator}
        />

        <ActionPanel
          compensationId={id}
          stato={compensation.stato as CompensationStatus}
          role={role}
          compensation={compensation}
        />

        {(history ?? []).length > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
                Cronologia
              </p>
              <Timeline events={history ?? []} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
