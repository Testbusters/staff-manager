import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import TicketForm from '@/components/ticket/TicketForm';
import { Card, CardContent } from '@/components/ui/card';

export default async function NuovoTicketPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) redirect('/pending');
  if (profile.role === 'responsabile_compensi') redirect('/');

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/ticket" className="text-sm text-muted-foreground hover:text-foreground transition">
          ← Ticket
        </Link>
        <span className="text-gray-700">/</span>
        <h1 className="text-xl font-semibold text-foreground">Nuovo ticket</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <TicketForm />
        </CardContent>
      </Card>
    </div>
  );
}
