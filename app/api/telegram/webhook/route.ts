// Unauthenticated webhook endpoint — registered with BotFather.
// Processes /start TOKEN commands only.
// ALWAYS returns HTTP 200 to prevent Telegram from retrying.
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { sendTelegram } from '@/lib/telegram';

function verifySecret(header: string | null): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected || !header) return false;
  try {
    const a = Buffer.from(header, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Always 200 — Telegram retries on non-200
  const secretHeader = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (!verifySecret(secretHeader)) {
    return NextResponse.json({ ok: true });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const update = body as {
    message?: {
      chat?: { id: number };
      text?: string;
    };
  };

  const chatId = update?.message?.chat?.id;
  const text = update?.message?.text?.trim() ?? '';

  if (!chatId || !text.startsWith('/start ')) {
    return NextResponse.json({ ok: true });
  }

  const token = text.replace('/start ', '').trim();
  if (!token || token.length > 128) return NextResponse.json({ ok: true });

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Look up the token
  const now = new Date().toISOString();
  const { data: tokenRow } = await svc
    .from('telegram_tokens')
    .select('id, collaborator_id, expires_at, used_at')
    .eq('token', token)
    .maybeSingle();

  if (!tokenRow || tokenRow.used_at || tokenRow.expires_at < now) {
    // Invalid/expired/already used — send friendly error, still 200
    sendTelegram(BigInt(chatId), '❌ Il link di collegamento non è valido o è scaduto.\n\nGenera un nuovo link dalla sezione <b>Impostazioni</b> del tuo profilo.').catch(() => {});
    return NextResponse.json({ ok: true });
  }

  // Mark token as used and set chat_id on collaborator atomically
  const [updateTokenResult, updateCollabResult] = await Promise.all([
    svc
      .from('telegram_tokens')
      .update({ used_at: now })
      .eq('id', tokenRow.id),
    svc
      .from('collaborators')
      .update({ telegram_chat_id: chatId })
      .eq('id', tokenRow.collaborator_id),
  ]);

  if (updateTokenResult.error || updateCollabResult.error) {
    sendTelegram(BigInt(chatId), '❌ Si è verificato un errore durante il collegamento. Riprova.').catch(() => {});
    return NextResponse.json({ ok: true });
  }

  // Success confirmation
  sendTelegram(
    BigInt(chatId),
    '✅ <b>Account collegato con successo!</b>\n\nRiceverai notifiche Telegram per le assegnazioni ai corsi, nuovi corsi nella tua città e promemoria lezioni.',
  ).catch(() => {});

  return NextResponse.json({ ok: true });
}
