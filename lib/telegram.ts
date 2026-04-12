// Telegram Bot API helper — fire-and-forget, never throws.
// Mirrors lib/email.ts pattern.
// Bot token env var: TELEGRAM_BOT_TOKEN

export async function sendTelegram(chatId: bigint, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    // Bot not configured — skip silently (staging / test environments)
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId.toString(),
        text,
        parse_mode: 'HTML',
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[telegram] send failed', chatId.toString(), res.status, body);
    }
  } catch (err) {
    console.error('[telegram] send error', chatId.toString(), err);
  }
}

// Message templates

export function telegramAssegnazioneCorsi(params: {
  nome: string;
  corso: string;
  ruolo: string;
}): string {
  return (
    `📚 <b>Nuova assegnazione corso</b>\n\n` +
    `Ciao ${params.nome}, sei stato assegnato come <b>${params.ruolo}</b> ` +
    `per il corso <b>${params.corso}</b>.`
  );
}

export function telegramNuovoCorsoInCitta(params: {
  nome: string;
  corso: string;
  citta: string;
  dataInizio: string;
  dataFine: string;
}): string {
  return (
    `🎓 <b>Nuovo corso nella tua città</b>\n\n` +
    `Ciao ${params.nome}, è stato pubblicato un nuovo corso a <b>${params.citta}</b>:\n` +
    `<b>${params.corso}</b>\n` +
    `📅 Dal ${params.dataInizio} al ${params.dataFine}`
  );
}

export function telegramValutazioneCorso(params: {
  nome: string;
  corso: string;
  ruolo: string;
  materia?: string;
  valutazione: number;
}): string {
  const materiaLine = params.materia
    ? `\n📖 Materia: <b>${params.materia}</b>`
    : '';
  return (
    `⭐ <b>Valutazione corso</b>\n\n` +
    `Ciao ${params.nome}, hai ricevuto una valutazione:\n\n` +
    `📚 Corso: <b>${params.corso}</b>\n` +
    `👤 Ruolo: <b>${params.ruolo}</b>` +
    materiaLine +
    `\n📊 Valutazione: <b>${params.valutazione}/10</b>`
  );
}

export function telegramReminderLezione(params: {
  nome: string;
  corso: string;
  lezione_data: string;
  orario: string;
  materia: string;
  ruolo: string;
}): string {
  return (
    `⏰ <b>Promemoria lezione</b>\n\n` +
    `Ciao ${params.nome}, domani hai una lezione!\n\n` +
    `📚 Corso: <b>${params.corso}</b>\n` +
    `📖 Materia: <b>${params.materia}</b>\n` +
    `👤 Ruolo: <b>${params.ruolo}</b>\n` +
    `📅 Data: <b>${params.lezione_data}</b>\n` +
    `🕐 Orario: <b>${params.orario}</b>`
  );
}
