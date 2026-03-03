import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Communication } from '@/lib/types';
import RichTextDisplay from '@/components/ui/RichTextDisplay';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

export default async function CommunicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active, member_status')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) redirect('/pending');
  if (profile.member_status === 'uscente_senza_compenso') redirect('/documenti');

  const { data: comm } = await supabase
    .from('communications')
    .select('*')
    .eq('id', id)
    .single();

  if (!comm) notFound();

  // Mark associated unread notification as read
  await supabase.from('notifications').update({ is_read: true })
    .eq('user_id', user.id).eq('entity_type', 'communication').eq('entity_id', id).eq('is_read', false);

  const c = comm as Communication;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Link href="/comunicazioni" className="text-sm text-gray-500 hover:text-gray-300 transition">
        ← Torna alle comunicazioni
      </Link>

      <div className="space-y-2">
        {c.pinned && <span className="text-blue-400 text-sm">📌 In evidenza</span>}
        <h1 className="text-2xl font-semibold text-gray-100">{c.titolo}</h1>
        <p className="text-sm text-gray-500">{formatDate(c.published_at)}</p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <RichTextDisplay html={c.contenuto} />
      </div>

      {c.file_urls && c.file_urls.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-400">Allegati</h2>
          <div className="flex flex-wrap gap-2">
            {c.file_urls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 px-3 py-2 text-sm text-gray-200 transition"
              >
                📎 Allegato {i + 1}
              </a>
            ))}
          </div>
        </div>
      )}

      {c.expires_at && (
        <p className="text-xs text-gray-600">
          Comunicazione valida fino al {new Date(c.expires_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      )}
    </div>
  );
}
