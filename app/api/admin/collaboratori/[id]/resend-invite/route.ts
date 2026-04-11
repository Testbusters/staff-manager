import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { sendEmail } from '@/lib/email';
import { getRenderedEmail } from '@/lib/email-template-service';
import { generatePassword } from '@/lib/password';

const paramsSchema = z.object({ id: z.string().uuid() });

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) {
    return NextResponse.json({ error: 'ID non valido' }, { status: 400 });
  }
  const { id: collaboratorId } = parsed.data;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Fetch caller profile + target collaborator in parallel (independent reads)
  const [{ data: caller }, { data: collab }] = await Promise.all([
    admin.from('user_profiles').select('role, is_active').eq('user_id', user.id).single(),
    admin.from('collaborators').select('id, user_id, email').eq('id', collaboratorId).maybeSingle(),
  ]);

  if (!caller?.is_active || caller.role !== 'amministrazione') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!collab?.user_id || !collab.email) {
    return NextResponse.json({ error: 'Collaboratore non trovato' }, { status: 404 });
  }

  // Validate: user must still need password change
  const { data: targetProfile } = await admin
    .from('user_profiles')
    .select('must_change_password')
    .eq('user_id', collab.user_id)
    .single();

  if (!targetProfile?.must_change_password) {
    return NextResponse.json(
      { error: 'L\'utente ha già completato il cambio password' },
      { status: 422 },
    );
  }

  // Generate new password and update auth user
  const password = generatePassword();
  const { error: updateErr } = await admin.auth.admin.updateUserById(collab.user_id, {
    password,
    app_metadata: { must_change_password: true },
  });

  if (updateErr) {
    return NextResponse.json({ error: 'Errore aggiornamento credenziali' }, { status: 500 });
  }

  // Ensure must_change_password stays true in user_profiles (defense-in-depth)
  await admin.from('user_profiles')
    .update({ must_change_password: true })
    .eq('user_id', collab.user_id);

  // Send invite email
  let emailSent = false;
  try {
    const { subject, html } = await getRenderedEmail('E8', {
      email: collab.email,
      password,
      ruolo: 'Collaboratore',
    });
    const result = await sendEmail(collab.email, subject, html);
    emailSent = result.success;
  } catch {
    // Template rendering failed
  }

  if (emailSent) {
    await admin.from('user_profiles')
      .update({ invite_email_sent: true })
      .eq('user_id', collab.user_id);
  }

  return NextResponse.json({
    email: collab.email,
    password,
    email_sent: emailSent,
  });
}
