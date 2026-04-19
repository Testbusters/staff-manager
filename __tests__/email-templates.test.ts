/**
 * Unit tests for lib/email-templates.ts
 * Verifies all 18 email templates (E1-E18) return {subject, html} with non-empty values.
 */
import { describe, it, expect } from 'vitest';
import {
  emailIntegrazioni,
  emailApprovato,
  emailRifiutato,
  emailPagato,
  emailDocumentoDaFirmare,
  emailNuovoInviato,
  emailNuovoTicket,
  emailInvito,
  emailRispostaTicket,
  emailNuovaComunicazione,
  emailNuovoEvento,
  emailNuovoContenuto,
  emailRimessaInAttesa,
  emailAssegnazioneCorsi,
  emailReminderLezione,
  emailRichiestaLiquidazione,
  emailEsitoLiquidazione,
  emailNuovoCorsoInCitta,
  emailValutazioneCorso,
} from '@/lib/email-templates';

function assertEmail(result: { subject: string; html: string }) {
  expect(result.subject).toBeTruthy();
  expect(result.html).toBeTruthy();
  expect(result.html).toContain('<!DOCTYPE');
}

describe('E1 — emailIntegrazioni', () => {
  it('returns subject and html', () => {
    assertEmail(emailIntegrazioni({ nome: 'Mario', tipo: 'Compenso', importo: 100, data: '2026-04-01' }));
  });
  it('includes nota when provided', () => {
    const { html } = emailIntegrazioni({ nome: 'Mario', tipo: 'Compenso', importo: 100, data: '2026-04-01', nota: 'Allegato mancante' });
    expect(html).toContain('Allegato mancante');
  });
});

describe('E2 — emailApprovato', () => {
  it('returns subject and html', () => {
    assertEmail(emailApprovato({ nome: 'Mario', tipo: 'Compenso', importo: 200, data: '2026-04-01' }));
  });
  it('subject contains tipo', () => {
    const { subject } = emailApprovato({ nome: 'Mario', tipo: 'Rimborso', importo: 50, data: '2026-04-01' });
    expect(subject.toLowerCase()).toContain('rimborso');
  });
});

describe('E3 — emailRifiutato', () => {
  it('returns subject and html', () => {
    assertEmail(emailRifiutato({ nome: 'Mario', tipo: 'Compenso', importo: 100, data: '2026-04-01' }));
  });
});

describe('E4 — emailPagato', () => {
  it('returns subject and html', () => {
    assertEmail(emailPagato({ nome: 'Mario', tipo: 'Compenso', importo: 100, dataPagamento: '2026-04-15' }));
  });
});

describe('E5 — emailDocumentoDaFirmare', () => {
  it('returns subject and html', () => {
    assertEmail(emailDocumentoDaFirmare({ nome: 'Mario', titoloDocumento: 'Contratto 2026', data: '2026-04-01' }));
  });
  it('includes link when provided', () => {
    const { html } = emailDocumentoDaFirmare({ nome: 'Mario', titoloDocumento: 'CU', data: '2026-04-01', link: 'https://example.com/doc' });
    expect(html).toContain('https://example.com/doc');
  });
});

describe('E6 — emailNuovoInviato', () => {
  it('returns subject and html', () => {
    assertEmail(emailNuovoInviato({
      nomeResponsabile: 'Admin', nomeCollaboratore: 'Mario',
      tipo: 'Compenso', importo: 100, community: 'Testbusters', data: '2026-04-01',
    }));
  });
});

describe('E7 — emailNuovoTicket', () => {
  it('returns subject and html', () => {
    assertEmail(emailNuovoTicket({
      nomeResponsabile: 'Admin', nomeCollaboratore: 'Mario',
      oggetto: 'Problema', categoria: 'Compenso', data: '2026-04-01',
    }));
  });
});

describe('E8 — emailInvito', () => {
  it('returns subject and html with credentials', () => {
    const r = emailInvito({ email: 'test@test.com', password: 'Pass123!', ruolo: 'Collaboratore' });
    assertEmail(r);
    expect(r.html).toContain('test@test.com');
    expect(r.html).toContain('Pass123!');
  });
  it('includes magic link when provided', () => {
    const { html } = emailInvito({ email: 'a@b.com', password: 'X', ruolo: 'Collaboratore', magicLink: 'https://magic.link' });
    expect(html).toContain('https://magic.link');
  });
});

describe('E9 — emailRispostaTicket', () => {
  it('returns subject and html', () => {
    assertEmail(emailRispostaTicket({ nome: 'Mario', oggetto: 'Ticket test', data: '2026-04-01' }));
  });
});

describe('E10 — emailNuovaComunicazione', () => {
  it('returns subject and html', () => {
    assertEmail(emailNuovaComunicazione({ nome: 'Mario', titolo: 'Comunicazione', data: '2026-04-01' }));
  });
});

describe('E11 — emailNuovoEvento', () => {
  it('returns subject and html', () => {
    assertEmail(emailNuovoEvento({ nome: 'Mario', titolo: 'Evento', data: '2026-04-01' }));
  });
});

describe('E12 — emailNuovoContenuto', () => {
  it('returns subject and html', () => {
    assertEmail(emailNuovoContenuto({ nome: 'Mario', tipo: 'Opportunità', titolo: 'Stage', data: '2026-04-01' }));
  });
});

describe('E13 — emailRimessaInAttesa', () => {
  it('returns subject and html', () => {
    assertEmail(emailRimessaInAttesa({ nome: 'Mario', tipo: 'Compenso', importo: 100, data: '2026-04-01' }));
  });
  it('includes nota when provided', () => {
    const { html } = emailRimessaInAttesa({ nome: 'Mario', tipo: 'Compenso', importo: 100, data: '2026-04-01', nota: 'Da rivedere' });
    expect(html).toContain('Da rivedere');
  });
});

describe('E13b — emailAssegnazioneCorsi', () => {
  it('returns subject and html', () => {
    assertEmail(emailAssegnazioneCorsi({ nome: 'Mario', corso: 'Corso Test', ruolo: 'Docente' }));
  });
});

describe('E14 — emailReminderLezione', () => {
  it('returns subject and html', () => {
    assertEmail(emailReminderLezione({
      nome: 'Mario', corso: 'Logica', lezione_data: '2026-06-15',
      orario: '10:00-12:00', materia: 'Logica', ruolo: 'Docente',
    }));
  });
});

describe('E15 — emailRichiestaLiquidazione', () => {
  it('returns subject and html', () => {
    assertEmail(emailRichiestaLiquidazione({
      nomeAdmin: 'Admin', nomeCollab: 'Mario', importoNetto: 500,
      iban: 'IT60X054', haPartitaIva: false, nRecord: 3,
    }));
  });
});

describe('E16 — emailEsitoLiquidazione', () => {
  it('returns subject and html for accettata', () => {
    assertEmail(emailEsitoLiquidazione({ nomeCollab: 'Mario', esito: 'accettata', importoNetto: 500 }));
  });
  it('returns subject and html for annullata with nota', () => {
    const r = emailEsitoLiquidazione({ nomeCollab: 'Mario', esito: 'annullata', importoNetto: 500, nota: 'IBAN errato' });
    assertEmail(r);
  });
});

describe('E17 — emailNuovoCorsoInCitta', () => {
  it('returns subject and html', () => {
    assertEmail(emailNuovoCorsoInCitta({
      nome: 'Mario', corso: 'Logica avanzata', citta: 'Roma',
      dataInizio: '2026-06-01', dataFine: '2026-06-30',
    }));
  });
});

describe('E18 — emailValutazioneCorso', () => {
  it('returns subject and html', () => {
    assertEmail(emailValutazioneCorso({
      nome: 'Mario', corso: 'Logica', ruolo: 'Docente', valutazione: 85,
    }));
  });
  it('includes materia when provided', () => {
    const { html } = emailValutazioneCorso({
      nome: 'Mario', corso: 'Logica', ruolo: 'Docente', materia: 'Matematica', valutazione: 90,
    });
    expect(html).toContain('Matematica');
  });
});
