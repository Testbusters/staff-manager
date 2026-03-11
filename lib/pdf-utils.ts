// PDF marker detection (pdfjs-dist) + overlay filling (pdf-lib)
// All operations are server-side only (Node.js API routes).

export interface PdfMarkerPosition {
  marker: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

const SIGNATURE_MARKERS = ['{firma}', '{firma_collaboratore}'];

// Find all occurrences of each marker string in the PDF using pdfjs-dist text extraction.
// Returns all positions (there may be multiple occurrences of the same marker, e.g. {firma} ×2).
export async function findMarkerPositions(
  pdfBuffer: Buffer,
  markers: string[],
): Promise<PdfMarkerPosition[]> {
  if (markers.length === 0) return [];

  // Dynamic import — pdfjs-dist is ESM, run worker inline for Node.js server use.
  // Setting workerSrc to the real worker file path makes pdfjs-dist fall back to
  // "fake worker" mode (runs inline in the main thread) when new Worker() is unavailable.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // @ts-ignore — no type declarations for this path
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs') as any;
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    // Use process.cwd() so the path resolves correctly in both plain Node.js
    // scripts and Next.js server (where import.meta.url points to compiled chunks).
    const { resolve } = await import('path');
    const workerPath = resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${workerPath}`;
  }

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    useSystemFonts: true,
    disableFontFace: true,
  }).promise;

  const positions: PdfMarkerPosition[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const textContent = await page.getTextContent();

    for (const item of textContent.items) {
      if (!item || typeof (item as { str?: string }).str !== 'string') continue;
      const { str, transform, width: itemWidth, height: itemHeight } = item as {
        str: string;
        transform: number[];
        width: number;
        height: number;
      };

      for (const marker of markers) {
        if (str === marker) {
          const [, , , scaleY, x, y] = transform;
          const h = Math.abs(itemHeight ?? scaleY ?? 12);
          const w = itemWidth ?? Math.abs(marker.length * (h * 0.55));
          positions.push({ marker, pageIndex: p - 1, x, y, width: w, height: h });
        }
      }
    }
  }

  return positions;
}

// Fill marker positions in the PDF:
//   - text markers → white rectangle + replacement text
//   - signature markers ({firma}, {firma_collaboratore}) with signatureBuffer → white rectangle + PNG image
//   - signature markers without signatureBuffer → skipped (marker text remains visible)
//
// Returns the modified PDF buffer.
export async function fillPdfMarkers(
  pdfBuffer: Buffer,
  values: Record<string, string>,
  signatureBuffer?: Buffer,
): Promise<Buffer> {
  const textMarkers = Object.keys(values);
  const sigMarkersToFill = signatureBuffer ? SIGNATURE_MARKERS : [];
  const allMarkersToFind = [...textMarkers, ...sigMarkersToFill];

  if (allMarkersToFind.length === 0) return pdfBuffer;

  const positions = await findMarkerPositions(pdfBuffer, allMarkersToFind);
  if (positions.length === 0) return pdfBuffer;

  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let sigImage: { width: number; height: number } & object | null = null;
  if (signatureBuffer) {
    try {
      sigImage = await pdfDoc.embedPng(signatureBuffer);
    } catch {
      try {
        sigImage = await pdfDoc.embedJpg(signatureBuffer);
      } catch {
        sigImage = null;
      }
    }
  }

  const pages = pdfDoc.getPages();

  for (const pos of positions) {
    const page = pages[pos.pageIndex];
    if (!page) continue;

    const rectHeight = Math.max(pos.height, 10);
    // Slight padding: cover a bit above and below the baseline
    const rectY = pos.y - 2;
    const rectW = Math.max(pos.width, 20);

    // 1. White rectangle to cover the marker text
    page.drawRectangle({
      x: pos.x,
      y: rectY,
      width: rectW + 4,
      height: rectHeight + 4,
      color: rgb(1, 1, 1),
    });

    if (SIGNATURE_MARKERS.includes(pos.marker) && sigImage) {
      // 2a. Signature PNG — fit within a reasonable area
      const sig = sigImage as unknown as { width: number; height: number; drawImage?: unknown };
      const sigW = Math.min(Math.max(rectW * 3, 80), 150);
      const sigH = sigW * (sig.height / sig.width);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      page.drawImage(sigImage as any, {
        x: pos.x,
        y: pos.y - sigH + Math.min(rectHeight, 16),
        width: sigW,
        height: sigH,
      });
    } else {
      const value = values[pos.marker] ?? '';
      if (value) {
        const fontSize = Math.max(7, Math.min(rectHeight, 12));
        page.drawText(value, {
          x: pos.x,
          y: pos.y,
          size: fontSize,
          font: helvetica,
          color: rgb(0, 0, 0),
        });
      }
    }
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

// Marker constants — canonical names used in the PDF templates
export const CONTRATTO_MARKERS = [
  '{nome}',
  '{cognome}',
  '{citta_nascita}',
  '{città_residenza}',
  '{indirizzo_residenza}',
  '{civico_residenza}',
  '{codice_fiscale}',
  '{data_nascita}',
  '{data_fine_contratto}',
  '{data_corrente}',
  '{firma}',
];

export const RICEVUTA_MARKERS = [
  '{nome}',
  '{cognome}',
  '{citta_residenza}',
  '{data_nascita}',
  '{indirizzo_residenza}',
  '{codice_fiscale}',
  '{totale_lordo_liquidato}',
  '{totale_ritenuta_acconto_liquidato}',
  '{totale_netto_liquidato}',
  '{citta_residenza_collaboratore}',
  '{data_corrente}',
  '{firma_collaboratore}',
];
