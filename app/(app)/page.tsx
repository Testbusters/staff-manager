import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import RespCittDashboard from './_dashboard/RespCittDashboard';
import RespCompensiDashboard from './_dashboard/RespCompensiDashboard';
import AdminDashboardPage from './_dashboard/AdminDashboardPage';
import CollabDashboard from './_dashboard/CollabDashboard';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const role = profile?.role ?? '';

  if (role === 'responsabile_cittadino') return <RespCittDashboard userId={user.id} />;
  if (role === 'responsabile_compensi') return <RespCompensiDashboard userId={user.id} />;
  if (role === 'amministrazione') return <AdminDashboardPage userId={user.id} />;
  return <CollabDashboard userId={user.id} role={role} />;
}
