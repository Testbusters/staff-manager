import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import FeedbackActions from '@/components/FeedbackActions';

interface FeedbackRow {
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

const CATEGORIA_COLORS: Record<string, string> = {
  Bug:          'text-red-400 bg-red-900/20 border-red-800/30',
  Suggerimento: 'text-blue-400 bg-blue-900/20 border-blue-800/30',
  Domanda:      'text-yellow-400 bg-yellow-900/20 border-yellow-800/30',
  Altro:        'text-gray-400 bg-gray-800/40 border-gray-700/30',
};

const ROLE_LABELS: Record<string, string> = {
  collaboratore:   'Collaboratore',
  responsabile:    'Responsabile',
  amministrazione: 'Admin',
};

function FeedbackCard({ item }: { item: FeedbackRow }) {
  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
              CATEGORIA_COLORS[item.categoria] ?? CATEGORIA_COLORS.Altro
            }`}
          >
            {item.categoria}
          </span>
          <span className="text-xs text-gray-500">
            {ROLE_LABELS[item.role] ?? item.role}
          </span>
          {item.pagina && (
            <span className="text-xs text-gray-600 font-mono">{item.pagina}</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-gray-600">
            {new Date(item.created_at).toLocaleString('it-IT', {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </span>
          <FeedbackActions id={item.id} stato={item.stato} />
        </div>
      </div>

      <p className="text-sm text-gray-300 whitespace-pre-wrap">{item.messaggio}</p>

      {item.screenshot_url && (
        <a
          href={item.screenshot_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition"
        >
          🖼 Visualizza screenshot
        </a>
      )}
    </div>
  );
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

  const nuovi      = feedback.filter(f => f.stato === 'nuovo');
  const completati = feedback.filter(f => f.stato === 'completato');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Feedback ricevuti</h1>
        <p className="text-sm text-gray-500 mt-0.5">{feedback.length} segnalazioni totali</p>
      </div>

      {/* Nuovi */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">Nuovi</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/30 border border-yellow-800/40 text-yellow-400 font-medium">
            {nuovi.length}
          </span>
        </div>

        {nuovi.length === 0 ? (
          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-8 text-center text-gray-500 text-sm">
            Nessun feedback in attesa.
          </div>
        ) : (
          <div className="space-y-3">
            {nuovi.map(item => <FeedbackCard key={item.id} item={item} />)}
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="border-t border-gray-800" />

      {/* Completati */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Completati</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-500 font-medium">
            {completati.length}
          </span>
        </div>

        {completati.length === 0 ? (
          <div className="rounded-2xl bg-gray-900/50 border border-gray-800/50 p-8 text-center text-gray-600 text-sm">
            Nessun feedback completato.
          </div>
        ) : (
          <div className="space-y-3 opacity-70">
            {completati.map(item => <FeedbackCard key={item.id} item={item} />)}
          </div>
        )}
      </section>
    </div>
  );
}
