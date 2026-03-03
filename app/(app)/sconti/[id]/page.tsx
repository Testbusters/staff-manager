import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Discount } from '@/lib/types';
import CopyButton from '@/components/ui/CopyButton';
import RichTextDisplay from '@/components/ui/RichTextDisplay';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
}

function expiryStatus(valid_to: string | null) {
  if (!valid_to) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(valid_to);
  const diffDays = Math.ceil((exp.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-500">Scaduto</span>;
  if (diffDays <= 7) return <span className="rounded-full bg-yellow-900/40 border border-yellow-700 px-2 py-0.5 text-xs text-yellow-300">In scadenza</span>;
  return <span className="rounded-full bg-green-900/30 border border-green-800 px-2 py-0.5 text-xs text-green-400">Attivo</span>;
}

export default async function DiscountDetailPage({
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

  const { data: disc } = await supabase
    .from('discounts')
    .select('*')
    .eq('id', id)
    .single();

  if (!disc) notFound();

  // Mark associated unread notification as read
  await supabase.from('notifications').update({ is_read: true })
    .eq('user_id', user.id).eq('entity_type', 'discount').eq('entity_id', id).eq('is_read', false);

  const d = disc as Discount;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Link href="/opportunita?tab=sconti" className="text-sm text-gray-500 hover:text-gray-300 transition">
        ← Torna agli sconti
      </Link>

      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {expiryStatus(d.valid_to)}
          {d.fornitore && <span className="text-xs text-gray-500">{d.fornitore}</span>}
        </div>
        <h1 className="text-2xl font-semibold text-gray-100">{d.titolo}</h1>
      </div>

      {d.logo_url && (
        <div className="flex items-center justify-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.logo_url} alt={d.fornitore || d.titolo} className="h-12 object-contain rounded" />
        </div>
      )}

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3">
        {d.descrizione && (
          <RichTextDisplay html={d.descrizione} />
        )}

        {d.codice_sconto && (
          <div className="border-t border-gray-800 pt-3">
            <p className="text-xs text-gray-500 mb-2">Codice sconto</p>
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm font-mono text-yellow-300">
                {d.codice_sconto}
              </span>
              <CopyButton text={d.codice_sconto} />
            </div>
          </div>
        )}

        {(d.valid_from || d.valid_to) && (
          <div className="border-t border-gray-800 pt-3 text-sm text-gray-400">
            {d.valid_from && <span>Dal {formatDate(d.valid_from)}</span>}
            {d.valid_from && d.valid_to && <span> · </span>}
            {d.valid_to && <span>Al {formatDate(d.valid_to)}</span>}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {d.link && (
          <a href={d.link} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-600 px-4 py-2 text-sm font-medium text-white transition">
            Scopri l&apos;offerta →
          </a>
        )}
        {d.file_url && (
          <a href={d.file_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm text-gray-200 transition">
            📎 Scarica allegato
          </a>
        )}
      </div>
    </div>
  );
}
