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
  Bug:          'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30',
  Suggerimento: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/30',
  Domanda:      'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/30',
  Altro:        'text-muted-foreground bg-muted/40 border-border/30',
};

const ROLE_LABELS: Record<string, string> = {
  collaboratore:   'Collaboratore',
  responsabile:    'Responsabile',
  amministrazione: 'Admin',
};

function FeedbackCard({ item }: { item: FeedbackRow }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
              CATEGORIA_COLORS[item.categoria] ?? CATEGORIA_COLORS.Altro
            }`}
          >
            {item.categoria}
          </span>
          <span className="text-xs text-muted-foreground">
            {ROLE_LABELS[item.role] ?? item.role}
          </span>
          {item.pagina && (
            <span className="text-xs text-muted-foreground font-mono">{item.pagina}</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground">
            {new Date(item.created_at).toLocaleString('it-IT', {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </span>
          <FeedbackActions id={item.id} stato={item.stato} />
        </div>
      </div>

      <p className="text-sm text-foreground whitespace-pre-wrap">{item.messaggio}</p>

      {item.screenshot_url && (
        <a
          href={item.screenshot_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-link hover:text-link/80 transition"
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
        <h1 className="text-xl font-semibold text-foreground">Feedback ricevuti</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{feedback.length} segnalazioni totali</p>
      </div>

      {/* Nuovi */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Nuovi</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800/40 text-yellow-700 dark:text-yellow-400 font-medium">
            {nuovi.length}
          </span>
        </div>

        {nuovi.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">
            Nessun feedback in attesa.
          </div>
        ) : (
          <div className="space-y-3">
            {nuovi.map(item => <FeedbackCard key={item.id} item={item} />)}
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Completati */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Completati</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground font-medium">
            {completati.length}
          </span>
        </div>

        {completati.length === 0 ? (
          <div className="rounded-2xl bg-card/50 border border-border/50 p-8 text-center text-muted-foreground text-sm">
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
