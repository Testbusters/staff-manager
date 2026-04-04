// HTML email templates for transactional notifications.
// All templates share a common header (Testbusters logo) and legal footer.

const LOGO_URL =
  'https://nyajqcjqmgxctlqighql.supabase.co/storage/v1/object/public/avatars/brand/testbusters_logo.png';

// APP_URL is the base URL of the application.
// Set the APP_URL environment variable in production to point to the live deployment.
const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

const BRAND_COLOR = '#E8320A';

// ── Shared layout ────────────────────────────────────────────
export function layout(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Staff Manager — Testbusters</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:${BRAND_COLOR};padding:28px 40px;text-align:center;">
              <img src="${LOGO_URL}" width="56" height="56" alt="Testbusters" style="display:inline-block;border-radius:50%;" />
              <div style="color:#ffffff;font-size:13px;font-weight:600;letter-spacing:0.05em;margin-top:10px;text-transform:uppercase;">Staff Manager</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0 0 6px;font-size:11px;color:#9ca3af;line-height:1.6;">
                Sede legale (non aperta al pubblico)<br/>
                Via Marco Ulpio Traiano 17, 20149 Milano
              </p>
              <p style="margin:0;font-size:10px;color:#d1d5db;line-height:1.6;">
                Testbusters S.r.l. Società Benefit &nbsp;|&nbsp; P.Iva / CF 08459930965 &nbsp;|&nbsp;
                Cod. Dest. M5UXCR1 &nbsp;|&nbsp; Cap. Soc. 50.000€
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function greeting(nome: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;color:#374151;">Ciao <strong>${nome}</strong>,</p>`;
}

function highlight(rows: { label: string; value: string }[]): string {
  const cells = rows
    .map(
      (r) =>
        `<tr>
          <td style="padding:8px 16px;font-size:12px;color:#6b7280;width:40%;">${r.label}</td>
          <td style="padding:8px 16px;font-size:13px;color:#111827;font-weight:600;">${r.value}</td>
        </tr>`,
    )
    .join('');
  return `<table width="100%" cellpadding="0" cellspacing="0"
    style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin:20px 0;border-collapse:collapse;">
    ${cells}
  </table>`;
}

function ctaButton(label: string, href?: string): string {
  return `<div style="text-align:center;margin:28px 0 8px;">
    <a href="${href ?? APP_URL}"
       style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;
              font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;letter-spacing:0.02em;">
      ${label}
    </a>
  </div>`;
}

function bodyText(text: string): string {
  return `<p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.6;">${text}</p>`;
}

function note(text: string): string {
  return `<div style="background:#fffbeb;border-left:3px solid #f59e0b;padding:10px 16px;border-radius:0 6px 6px 0;margin:12px 0;">
    <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;"><strong>Nota:</strong> ${text}</p>
  </div>`;
}

function eur(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

// ── E1 — Integrazioni richieste (compenso o rimborso) ────────
export function emailIntegrazioni(p: {
  nome: string;
  tipo: 'Compenso' | 'Rimborso';
  importo: number;
  data: string;
  nota?: string | null;
}): { subject: string; html: string } {
  const body = `
    ${greeting(p.nome)}
    ${bodyText(`Il tuo <strong>${p.tipo}</strong> del <strong>${p.data}</strong> richiede integrazioni prima di poter essere elaborato.`)}
    ${highlight([
      { label: 'Tipo', value: p.tipo },
      { label: 'Importo', value: eur(p.importo) },
      { label: 'Stato', value: 'Integrazioni richieste' },
    ])}
    ${p.nota ? note(p.nota) : ''}
    ${bodyText('Accedi all\'app per completare le informazioni richieste.')}
    ${ctaButton('Vai all\'app')}
  `;
  return {
    subject: `Hai un ${p.tipo.toLowerCase()} che richiede integrazioni`,
    html: layout(body),
  };
}

// ── E2 — Approvato ──────────────────────────────────────────
export function emailApprovato(p: {
  nome: string;
  tipo: 'Compenso' | 'Rimborso';
  importo: number;
  data: string;
}): { subject: string; html: string } {
  const body = `
    ${greeting(p.nome)}
    ${bodyText(`Il tuo <strong>${p.tipo}</strong> del <strong>${p.data}</strong> è stato <strong>approvato</strong> dall'amministrazione.`)}
    ${highlight([
      { label: 'Tipo', value: p.tipo },
      { label: 'Importo', value: eur(p.importo) },
      { label: 'Stato', value: 'Approvato' },
    ])}
    ${bodyText('Il pagamento verrà elaborato nei prossimi giorni.')}
    ${ctaButton('Vai all\'app')}
  `;
  return {
    subject: `Il tuo ${p.tipo.toLowerCase()} è stato approvato ✓`,
    html: layout(body),
  };
}

// ── E3 — Rifiutato ──────────────────────────────────────────
export function emailRifiutato(p: {
  nome: string;
  tipo: 'Compenso' | 'Rimborso';
  importo: number;
  data: string;
}): { subject: string; html: string } {
  const body = `
    ${greeting(p.nome)}
    ${bodyText(`Il tuo <strong>${p.tipo}</strong> del <strong>${p.data}</strong> non è stato approvato.`)}
    ${highlight([
      { label: 'Tipo', value: p.tipo },
      { label: 'Importo', value: eur(p.importo) },
      { label: 'Stato', value: 'Rifiutato' },
    ])}
    ${bodyText('Per chiarimenti contatta il tuo responsabile o apri un ticket di supporto.')}
    ${ctaButton('Vai all\'app')}
  `;
  return {
    subject: `Il tuo ${p.tipo.toLowerCase()} non è stato approvato`,
    html: layout(body),
  };
}

// ── E4 — Pagato ─────────────────────────────────────────────
export function emailPagato(p: {
  nome: string;
  tipo: 'Compenso' | 'Rimborso';
  importo: number;
  dataPagamento: string;
}): { subject: string; html: string } {
  const body = `
    ${greeting(p.nome)}
    ${bodyText(`Il pagamento del tuo <strong>${p.tipo}</strong> è stato registrato.`)}
    ${highlight([
      { label: 'Tipo', value: p.tipo },
      { label: 'Importo pagato', value: eur(p.importo) },
      { label: 'Data', value: p.dataPagamento },
    ])}
    ${bodyText('Puoi consultare il dettaglio e il riepilogo dei pagamenti nell\'app.')}
    ${ctaButton('Vai all\'app')}
  `;
  return {
    subject: `Pagamento effettuato — ${p.tipo} ${p.dataPagamento}`,
    html: layout(body),
  };
}

// ── E5 — Documento da firmare ───────────────────────────────
export function emailDocumentoDaFirmare(p: {
  nome: string;
  titoloDocumento: string;
  data: string;
  link?: string;
}): { subject: string; html: string } {
  const body = `
    ${greeting(p.nome)}
    ${bodyText('È disponibile un nuovo documento che richiede la tua firma.')}
    ${highlight([
      { label: 'Documento', value: p.titoloDocumento },
      { label: 'Caricato il', value: p.data },
    ])}
    ${bodyText('Accedi all\'app, visualizza il documento e apporvi la tua firma digitale o carica la versione firmata.')}
    ${ctaButton('Apri documento', p.link ? `${APP_URL}${p.link}` : undefined)}
  `;
  return {
    subject: 'Hai un nuovo documento da firmare',
    html: layout(body),
  };
}

// ── E6 — Nuovo compenso/rimborso inviato (→ responsabile) ───
export function emailNuovoInviato(p: {
  nomeResponsabile: string;
  nomeCollaboratore: string;
  tipo: 'Compenso' | 'Rimborso';
  importo: number;
  community: string;
  data: string;
}): { subject: string; html: string } {
  const body = `
    ${greeting(p.nomeResponsabile)}
    ${bodyText(`<strong>${p.nomeCollaboratore}</strong> ha inviato un nuovo <strong>${p.tipo}</strong> in attesa di pre-approvazione.`)}
    ${highlight([
      { label: 'Collaboratore', value: p.nomeCollaboratore },
      { label: 'Community', value: p.community },
      { label: 'Importo', value: eur(p.importo) },
      { label: 'Data invio', value: p.data },
    ])}
    ${bodyText('Accedi all\'app per esaminarlo e pre-approvarlo o richiedere integrazioni.')}
    ${ctaButton('Vai all\'app')}
  `;
  return {
    subject: `Nuovo ${p.tipo.toLowerCase()} da approvare — ${p.nomeCollaboratore}`,
    html: layout(body),
  };
}

// ── E8 — Invito utente ──────────────────────────────────────
export function emailInvito(p: {
  email: string;
  password: string;
  ruolo: string;
}): { subject: string; html: string } {
  const body = `
    ${bodyText('Sei stato invitato ad accedere a <strong>Staff Manager</strong>, la piattaforma di gestione collaboratori di Testbusters.')}
    ${highlight([
      { label: 'Email',              value: p.email },
      { label: 'Password temporanea', value: p.password },
      { label: 'Ruolo',              value: p.ruolo },
    ])}
    ${note('Al primo accesso ti verrà chiesto di impostare una nuova password personale.')}
    ${bodyText('Clicca sul pulsante qui sotto per accedere alla piattaforma.')}
    ${ctaButton('Accedi a Staff Manager')}
  `;
  return {
    subject: 'Sei stato invitato a Staff Manager — Testbusters',
    html: layout(body),
  };
}

// ── E9 — Risposta al ticket (→ collaboratore) ───────────────
export function emailRispostaTicket(p: {
  nome: string;
  oggetto: string;
  data: string;
}): { subject: string; html: string } {
  const body = `
    ${greeting(p.nome)}
    ${bodyText(`Hai ricevuto una risposta al tuo ticket <strong>${p.oggetto}</strong>.`)}
    ${highlight([
      { label: 'Oggetto', value: p.oggetto },
      { label: 'Data risposta', value: p.data },
    ])}
    ${bodyText("Accedi all'app per leggere la risposta e continuare la conversazione.")}
    ${ctaButton('Vai al ticket')}
  `;
  return {
    subject: `Risposta al tuo ticket — ${p.oggetto}`,
    html: layout(body),
  };
}

function htmlSection(html: string): string {
  const safe = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s*on\w+="[^"]*"/gi, '');
  return `<div style="color:#d1d5db;font-size:14px;line-height:1.7;margin-top:12px">${safe}</div>`;
}

// ── E10 — Nuova comunicazione (→ collaboratore) ──────────────
export function emailNuovaComunicazione(p: {
  nome: string;
  titolo: string;
  data: string;
  contenuto?: string;
}): { subject: string; html: string } {
  const body = `
    ${greeting(p.nome)}
    ${bodyText('È disponibile una nuova comunicazione dalla tua community.')}
    ${highlight([
      { label: 'Titolo', value: p.titolo },
      { label: 'Pubblicata il', value: p.data },
    ])}
    ${p.contenuto ? htmlSection(p.contenuto) : ''}
    ${ctaButton('Leggi la comunicazione')}
  `;
  return {
    subject: `Nuova comunicazione: ${p.titolo}`,
    html: layout(body),
  };
}

// ── E11 — Nuovo evento (→ collaboratore) ────────────────────
export function emailNuovoEvento(p: {
  nome: string;
  titolo: string;
  data: string;
  descrizione?: string;
}): { subject: string; html: string } {
  const body = `
    ${greeting(p.nome)}
    ${bodyText('È stato pubblicato un nuovo evento.')}
    ${highlight([
      { label: 'Evento', value: p.titolo },
      { label: 'Pubblicato il', value: p.data },
    ])}
    ${p.descrizione ? htmlSection(p.descrizione) : ''}
    ${ctaButton('Vedi i dettagli')}
  `;
  return {
    subject: `Nuovo evento in programma — ${p.titolo}`,
    html: layout(body),
  };
}

// ── E13 — Rimesso in attesa ──────────────────────────────────
export function emailRimessaInAttesa(p: {
  nome: string;
  tipo: 'Compenso' | 'Rimborso';
  importo: number;
  data: string;
  nota?: string | null;
}): { subject: string; html: string } {
  const body = `
    ${greeting(p.nome)}
    ${bodyText(`Il tuo <strong>${p.tipo}</strong> del <strong>${p.data}</strong> è stato rimesso in attesa di approvazione.`)}
    ${highlight([
      { label: 'Tipo', value: p.tipo },
      { label: 'Importo', value: eur(p.importo) },
      { label: 'Stato', value: 'In attesa' },
    ])}
    ${p.nota ? note(p.nota) : ''}
    ${bodyText('Per chiarimenti contatta il tuo responsabile o apri un ticket di supporto.')}
    ${ctaButton("Vai all'app")}
  `;
  return {
    subject: `Il tuo ${p.tipo.toLowerCase()} è stato rimesso in attesa`,
    html: layout(body),
  };
}

// ── E12 — Nuovo contenuto generico (→ collaboratore) ─────────
// Used for opportunità and sconti (tipo = 'Opportunità' | 'Sconto').
export function emailNuovoContenuto(p: {
  nome: string;
  tipo: string;
  titolo: string;
  data: string;
  descrizione?: string;
}): { subject: string; html: string } {
  const body = `
    ${greeting(p.nome)}
    ${bodyText(`È disponibile un nuovo contenuto nella sezione <strong>${p.tipo}</strong>.`)}
    ${highlight([
      { label: p.tipo, value: p.titolo },
      { label: 'Pubblicato il', value: p.data },
    ])}
    ${p.descrizione ? htmlSection(p.descrizione) : ''}
    ${ctaButton("Vai all'app")}
  `;
  return {
    subject: `Nuov${p.tipo === 'Sconto' ? 'o' : 'a'} ${p.tipo.toLowerCase()}: ${p.titolo}`,
    html: layout(body),
  };
}

// ── E7 — Nuovo ticket (→ responsabile) ─────────────────────
export function emailNuovoTicket(p: {
  nomeResponsabile: string;
  nomeCollaboratore: string;
  oggetto: string;
  categoria: string;
  data: string;
}): { subject: string; html: string } {
  const body = `
    ${greeting(p.nomeResponsabile)}
    ${bodyText(`<strong>${p.nomeCollaboratore}</strong> ha aperto un nuovo ticket di supporto.`)}
    ${highlight([
      { label: 'Collaboratore', value: p.nomeCollaboratore },
      { label: 'Riferimento', value: p.categoria },
      { label: 'Oggetto', value: p.oggetto },
      { label: 'Data', value: p.data },
    ])}
    ${bodyText('Accedi all\'app per leggere il messaggio e rispondere.')}
    ${ctaButton('Vai al ticket')}
  `;
  return {
    subject: `Nuovo ticket di supporto — ${p.oggetto}`,
    html: layout(body),
  };
}

// ── E13 — Assegnazione corso (docente / Q&A / CoCoD'à) ────────
export function emailAssegnazioneCorsi(p: {
  nome: string;
  corso: string;
  ruolo: string;
  link?: string;
}): { subject: string; html: string } {
  const body = `
    ${greeting(p.nome)}
    ${bodyText(`Sei stato assegnato come <strong>${p.ruolo}</strong> per il seguente corso.`)}
    ${highlight([
      { label: 'Corso', value: p.corso },
      { label: 'Ruolo', value: p.ruolo },
    ])}
    ${bodyText('Accedi all\'app per consultare i dettagli del corso e le lezioni in programma.')}
    ${ctaButton('Vai ai corsi', p.link ?? `${APP_URL}/corsi`)}
  `;
  return {
    subject: `Sei stato assegnato come ${p.ruolo} — ${p.corso}`,
    html: layout(body),
  };
}

// ── E14 — Reminder lezione (24h prima) ────────────────────────
export function emailReminderLezione(p: {
  nome: string;
  corso: string;
  lezione_data: string;
  orario: string;
  materia: string;
  ruolo: string;
  link?: string;
}): { subject: string; html: string } {
  const body = `
    ${greeting(p.nome)}
    ${bodyText(`Ricordati che domani hai una lezione programmata come <strong>${p.ruolo}</strong>.`)}
    ${highlight([
      { label: 'Corso', value: p.corso },
      { label: 'Materia', value: p.materia },
      { label: 'Data', value: p.lezione_data },
      { label: 'Orario', value: p.orario },
      { label: 'Ruolo', value: p.ruolo },
    ])}
    ${bodyText('Accedi all\'app per consultare i materiali e i dettagli della lezione.')}
    ${ctaButton('Vai ai corsi', p.link ?? `${APP_URL}/corsi`)}
  `;
  return {
    subject: `Reminder: lezione domani — ${p.corso} (${p.materia})`,
    html: layout(body),
  };
}

// ── E15 — Richiesta liquidazione (→ admin) ────────────────────
export function emailRichiestaLiquidazione(p: {
  nomeAdmin: string;
  nomeCollab: string;
  importoNetto: number;
  iban: string;
  haPartitaIva: boolean;
  nRecord: number;
}): { subject: string; html: string } {
  const maskedIban = p.iban.length > 8
    ? p.iban.slice(0, 4) + '****' + p.iban.slice(-4)
    : p.iban;
  const body = `
    ${greeting(p.nomeAdmin)}
    ${bodyText(`Il collaboratore <strong>${p.nomeCollab}</strong> ha inviato una richiesta di liquidazione.`)}
    ${highlight([
      { label: 'Collaboratore', value: p.nomeCollab },
      { label: 'Importo netto', value: `€${p.importoNetto.toFixed(2)}` },
      { label: 'Record selezionati', value: String(p.nRecord) },
      { label: 'IBAN', value: maskedIban },
      { label: 'Partita IVA', value: p.haPartitaIva ? 'Sì' : 'No' },
    ])}
    ${bodyText('Accedi alla coda lavoro per accettare o rifiutare la richiesta.')}
    ${ctaButton('Vai alla coda lavoro', `${APP_URL}/coda?tab=liquidazioni`)}
  `;
  return {
    subject: `Richiesta di liquidazione — ${p.nomeCollab}`,
    html: layout(body),
  };
}

// ── E16 — Esito richiesta liquidazione (→ collab) ─────────────
export function emailEsitoLiquidazione(p: {
  nomeCollab: string;
  esito: 'accettata' | 'annullata';
  importoNetto: number;
  nota?: string | null;
}): { subject: string; html: string } {
  const esitoLabel = p.esito === 'accettata' ? 'accettata' : 'annullata';
  const message = p.esito === 'accettata'
    ? `La tua richiesta di liquidazione di <strong>€${p.importoNetto.toFixed(2)}</strong> è stata <strong>accettata</strong>. I compensi e i rimborsi selezionati sono stati contrassegnati come liquidati.`
    : `La tua richiesta di liquidazione di <strong>€${p.importoNetto.toFixed(2)}</strong> è stata <strong>annullata</strong>.`;

  const highlightRows: { label: string; value: string }[] = [
    { label: 'Importo netto', value: `€${p.importoNetto.toFixed(2)}` },
    { label: 'Esito', value: p.esito === 'accettata' ? 'Accettata' : 'Annullata' },
  ];
  if (p.nota) highlightRows.push({ label: 'Nota', value: p.nota });

  const body = `
    ${greeting(p.nomeCollab)}
    ${bodyText(message)}
    ${highlight(highlightRows)}
    ${bodyText('Accedi all\'app per consultare lo stato dei tuoi compensi e rimborsi.')}
    ${ctaButton('Vai ai compensi', `${APP_URL}/compensi`)}
  `;
  return {
    subject: p.esito === 'accettata'
      ? 'La tua richiesta di liquidazione è stata accettata'
      : 'La tua richiesta di liquidazione è stata annullata',
    html: layout(body),
  };
}

// ── E17 — Nuovo corso programmato nella tua città ─────────────
export function emailNuovoCorsoInCitta(p: {
  nome: string;
  corso: string;
  citta: string;
  dataInizio: string;
  dataFine: string;
  link?: string;
}): { subject: string; html: string } {
  const body = `
    ${greeting(p.nome)}
    ${bodyText(`È stato programmato un nuovo corso nella tua città: <strong>${p.citta}</strong>.`)}
    ${highlight([
      { label: 'Corso', value: p.corso },
      { label: 'Città', value: p.citta },
      { label: 'Periodo', value: `${p.dataInizio} → ${p.dataFine}` },
    ])}
    ${bodyText('Accedi all\'app per consultare i dettagli e candidarti come docente.')}
    ${ctaButton('Vai ai corsi', p.link ?? `${APP_URL}/corsi`)}
  `;
  return {
    subject: `Nuovo corso a ${p.citta} — ${p.corso}`,
    html: layout(body),
  };
}
