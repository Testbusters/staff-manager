import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import {
  buildTicketReplyNotification,
  buildTicketCollabReplyNotification,
} from '@/lib/notification-utils';
import { ticketMessageSchema } from '@/lib/schemas/ticket';
import {
  getNotificationSettings,
  getResponsabiliForUser,
} from '@/lib/notification-helpers';
import { sendEmail } from '@/lib/email';
import { getRenderedEmail } from '@/lib/email-template-service';
import { isValidUUID } from '@/lib/validate-id';

const BUCKET = 'tickets';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: ticketId } = await params;
  if (!isValidUUID(ticketId)) return NextResponse.json({ error: 'ID non valido' }, { status: 400 });
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Utente non attivo' }, { status: 403 });

  // Use service role for all DB operations to avoid SSR auth cookie ambiguities
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Fetch ticket via service role (bypasses RLS — access control done explicitly below)
  const { data: ticket, error: ticketErr } = await serviceClient
    .from('tickets')
    .select('id, creator_user_id, oggetto, stato')
    .eq('id', ticketId)
    .single();

  if (ticketErr || !ticket) {
    return NextResponse.json({ error: 'Ticket non trovato' }, { status: 404 });
  }

  // Explicit access check: only creator or admin/responsabile can reply
  const canAccess =
    ticket.creator_user_id === user.id ||
    ['amministrazione', 'responsabile_compensi'].includes(profile.role);

  if (!canAccess) {
    return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
  }

  if (ticket.stato === 'CHIUSO') {
    return NextResponse.json({ error: 'Il ticket è chiuso' }, { status: 409 });
  }

  const formData = await request.formData();
  const rawMessage = (formData.get('message') as string | null)?.trim();
  const file = formData.get('file') as File | null;

  const parsed = ticketMessageSchema.safeParse({ message: rawMessage });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', issues: parsed.error.issues }, { status: 400 });
  }
  const { message } = parsed.data;

  // Upload attachment if provided
  let attachment_url: string | null = null;
  let attachment_name: string | null = null;

  const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB
  if (file && file.size > MAX_ATTACHMENT_SIZE) {
    return NextResponse.json({ error: 'Il file è troppo grande. Dimensione massima: 10 MB.' }, { status: 413 });
  }

  if (file && file.size > 0) {
    const messageId = crypto.randomUUID();
    const storagePath = `${ticketId}/${messageId}/${file.name}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await serviceClient.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadErr) {
      console.error('[ticket-messages] upload error:', uploadErr.message);
      return NextResponse.json({ error: 'Errore upload allegato' }, { status: 500 });
    }

    attachment_url = storagePath;
    attachment_name = file.name;
  }

  // Insert message (service role to bypass RLS complexity with storage path)
  const { data: msg, error: msgErr } = await serviceClient
    .from('ticket_messages')
    .insert({
      ticket_id: ticketId,
      author_user_id: user.id,
      message,
      attachment_url,
      attachment_name,
    })
    .select()
    .single();

  if (msgErr) return NextResponse.json({ error: 'Errore interno' }, { status: 500 });

  // Update denormalized last-message fields + updated_at on the ticket
  const authorProfile = await serviceClient
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  const authorRole = authorProfile.data?.role ?? 'collaboratore';
  const authorCollab = await serviceClient
    .from('collaborators')
    .select('nome, cognome')
    .eq('user_id', user.id)
    .maybeSingle();
  const authorName = authorCollab.data
    ? `${authorCollab.data.nome ?? ''} ${authorCollab.data.cognome ?? ''}`.trim()
    : authorRole;

  const ticketUpdate: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    last_message_at: msg.created_at,
    last_message_author_name: authorName || authorRole,
    last_message_author_role: authorRole,
  };
  // Auto-advance to IN_LAVORAZIONE when a manager replies on an open ticket
  if (ticket.creator_user_id !== user.id && ticket.stato === 'APERTO') {
    ticketUpdate.stato = 'IN_LAVORAZIONE';
  }
  await serviceClient
    .from('tickets')
    .update(ticketUpdate)
    .eq('id', ticketId);

  // Load notification settings
  const settings = await getNotificationSettings(serviceClient);

  if (ticket.creator_user_id !== user.id) {
    // Admin/responsabile replied → notify creator (ticket_risposta:collaboratore)
    const setting = settings.get('ticket_risposta:collaboratore');
    if (!setting || setting.inapp_enabled) {
      const notif = buildTicketReplyNotification(
        ticket.creator_user_id,
        ticketId,
        ticket.oggetto,
      );
      await serviceClient.from('notifications').insert(notif);
    }
    if (setting?.email_enabled) {
      const { data: creatorAuth } = await serviceClient.auth.admin.getUserById(ticket.creator_user_id);
      const creatorEmail = creatorAuth?.user?.email;
      const { data: creatorCollab } = await serviceClient
        .from('collaborators')
        .select('nome')
        .eq('user_id', ticket.creator_user_id)
        .single();
      if (creatorEmail) {
        getRenderedEmail('E9', {
          nome: creatorCollab?.nome ?? '',
          oggetto: ticket.oggetto,
          data: new Date().toLocaleDateString('it-IT'),
        }).then(({ subject, html }) => {
          sendEmail(creatorEmail, subject, html).catch(() => {});
        }).catch(() => {});
      }
    }
  } else {
    // Collaboratore (creator) replied → notify responsabili (ticket_risposta_collab:responsabile)
    const setting = settings.get('ticket_risposta_collab:responsabile_compensi');
    if (setting?.inapp_enabled || setting?.email_enabled) {
      const responsabili = await getResponsabiliForUser(user.id, serviceClient);
      for (const resp of responsabili) {
        if (setting.inapp_enabled) {
          await serviceClient
            .from('notifications')
            .insert(buildTicketCollabReplyNotification(resp.user_id, ticketId, ticket.oggetto));
        }
        if (setting.email_enabled && resp.email) {
          // Fetch collaboratore name for email
          const { data: collabRec } = await serviceClient
            .from('collaborators')
            .select('nome, cognome')
            .eq('user_id', user.id)
            .single();
          const nomeColl = collabRec ? `${collabRec.nome} ${collabRec.cognome}`.trim() : '';
          getRenderedEmail('E7', {
            nomeResponsabile: resp.nome,
            nomeCollaboratore: nomeColl,
            oggetto: ticket.oggetto,
            categoria: '',
            data: new Date().toLocaleDateString('it-IT'),
          }).then(({ subject, html }) => {
            sendEmail(resp.email!, subject, html).catch(() => {});
          }).catch(() => {});
        }
      }
    }
  }

  return NextResponse.json({ data: msg }, { status: 201 });
}
