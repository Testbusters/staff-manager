// Server-side document generation using PDF templates + pdfjs-dist marker overlay.
// All functions are Node.js only (not for use in Client Components).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ContractTemplateType } from '@/lib/types';
import { fillPdfMarkers } from '@/lib/pdf-utils';
export { calcRitenuta, getContractTemplateTipo, getReceiptTemplateTipo } from '@/lib/ritenuta';

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
    luogo_nascita: string | null;
    comune: string | null;
  },
  totals: {
    lordo_compensi: number;
    lordo_rimborsi: number;
    totale_lordo: number;
    ritenuta: number;
    netto: number;
  },
): Record<string, string> {
  // Amounts without € prefix — template already has "Euro €" as static text
  const fmt = (n: number) => n.toFixed(2).replace('.', ',');
  return {
    '{nome}':                                 collab.nome ?? '',
    '{cognome}':                              collab.cognome ?? '',
    '{citta_nascita}':                        collab.luogo_nascita ?? '',
    '{citta_residenza}':                      collab.comune ?? '',
    '{data_nascita}':                         formatDate(collab.data_nascita),
    '{codice_fiscale}':                       collab.codice_fiscale ?? '',
    '{totale_lordo_liquidato}':               fmt(totals.totale_lordo),
    '{totale_ritenuta_acconto_liquidato}':    fmt(totals.ritenuta),
    '{totale_netto_liquidato}':               fmt(totals.netto),
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
    const { data: tplRow, error: tplErr } = await svc
      .from('contract_templates')
      .select('file_url')
      .eq('tipo', tipo)
      .maybeSingle();

    console.log('[generateDocumentFromTemplate] template query:', { tipo, found: !!tplRow, error: tplErr?.message ?? null });
    if (!tplRow) return null;

    // file_url may be a full Supabase storage URL or a relative path within the bucket.
    // The 'contracts' bucket is private — must use the service role client (svc.storage),
    // never fetch() on a public URL (returns 400 for private buckets).
    // Extract the relative path from full URLs: strip everything up to '/contracts/'.
    let storagePath = tplRow.file_url as string;
    const bucketMarker = '/contracts/';
    const markerIdx = storagePath.indexOf(bucketMarker);
    if (markerIdx !== -1) {
      storagePath = storagePath.slice(markerIdx + bucketMarker.length);
    }

    console.log('[generateDocumentFromTemplate] downloading from contracts bucket:', storagePath);
    const { data: blob, error: downloadErr } = await svc.storage
      .from('contracts')
      .download(storagePath);
    if (downloadErr || !blob) {
      console.error('[generateDocumentFromTemplate] download failed:', downloadErr?.message ?? 'blob is null');
      return null;
    }
    console.log('[generateDocumentFromTemplate] download OK, size:', blob.size, '— calling fillPdfMarkers...');
    const templateBuffer = Buffer.from(await blob.arrayBuffer());
    const filled = await fillPdfMarkers(templateBuffer, vars, signatureBuffer);
    console.log('[generateDocumentFromTemplate] fillPdfMarkers OK, result size:', filled.length);
    return filled;
  } catch (err) {
    console.error('[generateDocumentFromTemplate]', err);
    return null;
  }
}
