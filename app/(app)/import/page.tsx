import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ImportSection from '@/components/import/ImportSection';

export default async function ImportPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) redirect('/pending');
  if (profile.role !== 'amministrazione') redirect('/');

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Import</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Importazione massiva di collaboratori, contratti e CU.
        </p>
      </div>

      <ImportSection />
    </div>
  );
}
