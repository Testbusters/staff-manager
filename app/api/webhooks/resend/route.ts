import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';

// Resend webhook signature verification (Svix-compatible)
// Signed content: `{svix-id}.{svix-timestamp}.{rawBody}`
// Secret: `whsec_{base64}` → strip prefix, base64-decode
function verifySignature(
  rawBody: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string,
): boolean {
  const base64Secret = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const keyBytes = Buffer.from(base64Secret, 'base64');
  const signed = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expectedHex = createHmac('sha256', keyBytes).update(signed).digest('base64');
  // svix-signature header may contain multiple signatures: "v1,<sig1> v1,<sig2>"
  const sigs = svixSignature.split(' ').map((s) => s.replace(/^v1,/, ''));
  return sigs.some((s) => s === expectedHex);
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const svixId = request.headers.get('svix-id') ?? '';
  const svixTimestamp = request.headers.get('svix-timestamp') ?? '';
  const svixSignature = request.headers.get('svix-signature') ?? '';

  const rawBody = await request.text();

  if (!verifySignature(rawBody, svixId, svixTimestamp, svixSignature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = (payload.type as string) ?? '';
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const resendEmailId = (data.email_id as string) ?? '';
  const recipient = Array.isArray(data.to) ? (data.to as string[])[0] : ((data.to as string) ?? '');
  const subject = (data.subject as string) ?? '';

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  await svc.from('email_events').insert({
    resend_email_id: resendEmailId || null,
    recipient,
    subject,
    event_type: eventType,
  });

  return NextResponse.json({ received: true });
}
