import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import CompensationCreateWizard from '@/components/compensation/CompensationCreateWizard';

export default async function CaricoCompensiPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) redirect('/pending');
  if (!['responsabile_compensi', 'amministrazione'].includes(profile.role)) redirect('/');

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Fetch managed communities (for collaborator search filter)
  let managedCommunities: { id: string; name: string }[] = [];

  if (profile.role === 'responsabile_compensi') {
    const { data: access } = await svc
      .from('user_community_access')
      .select('community_id')
      .eq('user_id', user.id);

    const ids = (access ?? []).map((a: { community_id: string }) => a.community_id);
    if (ids.length > 0) {
      const { data: communities } = await svc
        .from('communities')
        .select('id, name')
        .in('id', ids)
        .order('name');
      managedCommunities = communities ?? [];
    }
  } else {
    const { data: communities } = await svc
      .from('communities')
      .select('id, name')
      .order('name');
    managedCommunities = communities ?? [];
  }

  // Fetch active competenze for dropdown
  const { data: competenze } = await svc
    .from('compensation_competenze')
    .select('key, label')
    .eq('active', true)
    .order('sort_order');

  return (
    <CompensationCreateWizard
      managedCommunities={managedCommunities}
      competenze={competenze ?? []}
    />
  );
}
