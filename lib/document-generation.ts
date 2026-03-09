// Server-side document generation using PDF templates + pdfjs-dist marker overlay.
// All functions are Node.js only (not for use in Client Components).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ContractTemplateType } from '@/lib/types';
import { fillPdfMarkers } from '@/lib/pdf-utils';

function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  try {
    return new Date(isoDate).toLocaleDateString('it-IT');
  } catch {
    return isoDate ?? '';
  }
}

function formatDateToday(): string {
  return new Date().toLocaleDateString('it-IT');
}

function formatEuro(n: number): string {
  return `€ ${n.toFixed(2).replace('.', ',')}`;
}

// Build the vars dict for a CONTRATTO_OCCASIONALE template.
// Maps collaborator DB fields to the PDF marker names confirmed in the template.
export function buildContractVars(collab: {
  nome: string | null;
  cognome: string | null;
  codice_fiscale: string | null;
  data_nascita: string | null;
  luogo_nascita: string | null;
  comune: string | null;
  indirizzo: string | null;
  civico_residenza: string | null;
  data_fine_contratto?: string | null;
}): Record<string, string> {
  return {
    '{nome}':                 collab.nome ?? '',
    '{cognome}':              collab.cognome ?? '',
    '{citta_nascita}':        collab.luogo_nascita ?? '',
    '{città_residenza}':      collab.comune ?? '',
    '{indirizzo_residenza}':  collab.indirizzo ?? '',
    '{civico_residenza}':     collab.civico_residenza ?? '',
    '{codice_fiscale}':       collab.codice_fiscale ?? '',
    '{data_nascita}':         formatDate(collab.data_nascita),
    '{data_fine_contratto}':  formatDate(collab.data_fine_contratto),
    '{data_corrente}':        formatDateToday(),
  };
}

// Build the vars dict for a RICEVUTA_PAGAMENTO template.
export function buildReceiptVars(
  collab: {
    nome: string | null;
    cognome: string | null;
    codice_fiscale: string | null;
    data_nascita: string | null;
    comune: string | null;
    indirizzo: string | null;
  },
  totals: {
    lordo_compensi: number;
    lordo_rimborsi: number;
    totale_lordo: number;
    ritenuta: number;
    netto: number;
  },
): Record<string, string> {
  return {
    '{nome}':                                 collab.nome ?? '',
    '{cognome}':                              collab.cognome ?? '',
    '{citta_residenza}':                      collab.comune ?? '',
    '{data_nascita}':                         formatDate(collab.data_nascita),
    '{indirizzo_residenza}':                  collab.indirizzo ?? '',
    '{codice_fiscale}':                       collab.codice_fiscale ?? '',
    '{totale_lordo_liquidato}':               formatEuro(totals.totale_lordo),
    '{totale_ritenuta_acconto_liquidato}':    formatEuro(totals.ritenuta),
    '{totale_netto_liquidato}':               formatEuro(totals.netto),
    '{citta_residenza_collaboratore}':        collab.comune ?? '',
    '{data_corrente}':                        formatDateToday(),
  };
}

// Download the template PDF from the contracts bucket, fill it with vars
// (and optionally embed a signature), and return the resulting PDF buffer.
// Returns null on any error (best-effort — never throws).
export async function generateDocumentFromTemplate(
  svc: SupabaseClient<any, any, any>,
  tipo: ContractTemplateType,
  vars: Record<string, string>,
  signatureBuffer?: Buffer,
): Promise<Buffer | null> {
  try {
    const { data: tplRow } = await svc
      .from('contract_templates')
      .select('file_url')
      .eq('tipo', tipo)
      .maybeSingle();

    if (!tplRow) return null;

    const { data: blob, error: downloadErr } = await svc.storage
      .from('contracts')
      .download(tplRow.file_url);

    if (downloadErr || !blob) return null;

    const templateBuffer = Buffer.from(await blob.arrayBuffer());
    const filled = await fillPdfMarkers(templateBuffer, vars, signatureBuffer);
    return filled;
  } catch (err) {
    console.error('[generateDocumentFromTemplate]', err);
    return null;
  }
}
