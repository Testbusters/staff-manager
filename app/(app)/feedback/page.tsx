import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import FeedbackPageClient from './FeedbackPageClient';

export interface FeedbackRow {
  id:              string;
  user_id:         string;
  role:            string;
  categoria:       string;
  pagina:          string;
  messaggio:       string;
  stato:           string;
  screenshot_path: string | null;
  created_at:      string;
  screenshot_url?: string | null;
}

export default async function FeedbackPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.role !== 'amministrazione') redirect('/');

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: rows } = await svc
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false });

  const feedback: FeedbackRow[] = await Promise.all(
    (rows ?? []).map(async (r: FeedbackRow) => {
      if (!r.screenshot_path) return r;
      const { data: signedData } = await svc.storage
        .from('feedback')
        .createSignedUrl(r.screenshot_path, 3600);
      return { ...r, screenshot_url: signedData?.signedUrl ?? null };
    }),
  );

  return <FeedbackPageClient feedback={feedback} />;
}
