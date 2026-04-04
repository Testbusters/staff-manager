// Authenticated route — collaboratore only.
// Generates a one-time deep link for Telegram bot connection.
// Token TTL: 15 minutes.
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const TOKEN_TTL_SECONDS = 900; // 15 minutes

export async function POST(_req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (profile.role !== 'collaboratore') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Look up collaborator id
  const { data: collab } = await svc
    .from('collaborators')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!collab) return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();

  // Upsert: one pending token per collaborator
  const { error } = await svc
    .from('telegram_tokens')
    .upsert(
      {
        collaborator_id: collab.id,
        token,
        expires_at: expiresAt,
        used_at: null,
      },
      { onConflict: 'collaborator_id' },
    );

  if (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? 'staffmanager_bot';
  const deepLink = `https://t.me/${botUsername}?start=${token}`;

  return NextResponse.json({ deep_link: deepLink, expires_in_seconds: TOKEN_TTL_SECONDS });
}
