// PDF marker detection (pdfjs-dist) + overlay filling (pdf-lib)
// All operations are server-side only (Node.js API routes).

export interface PdfMarkerPosition {
  marker: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  /** True when the marker was the entire text item (standalone). False when embedded in a longer run. */
  isStandalone: boolean;
  /** True when rectWidth already equals the full allocated space (Case 1b: marker + trailing underscores/spaces).
   *  When true, rightExtension must be 0 — the underscores reserve the space and static text may follow immediately. */
  isFullWidth: boolean;
}

const SIGNATURE_MARKERS = ['{firma}', '{firma_collaboratore}'];

// Find all occurrences of each marker string in the PDF using pdfjs-dist text extraction.
// Returns all positions (there may be multiple occurrences of the same marker, e.g. {firma} ×2).
export async function findMarkerPositions(
  pdfBuffer: Buffer,
  markers: string[],
  eraseTrailingUnderscores = false,
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

    type TextItem = { str: string; transform: number[]; width: number; height: number };
    const items = (textContent.items as unknown[]).filter(
      (item): item is TextItem =>
        !!item && typeof (item as TextItem).str === 'string',
    );

    for (let i = 0; i < items.length; i++) {
      const { str, transform, width: itemWidth, height: itemHeight } = items[i];
      const [, , , scaleY, x, y] = transform;
      const h = Math.abs(itemHeight ?? scaleY ?? 12);
      const totalW = itemWidth ?? 0;

      for (const marker of markers) {
        // Case 1: exact match — marker is the entire text item (standalone)
        if (str === marker) {
          const w = totalW > 0 ? totalW : Math.abs(marker.length * (h * 0.55));
          positions.push({ marker, pageIndex: p - 1, x, y, width: w, height: h, isStandalone: true, isFullWidth: false });
          continue;
        }

        // Case 1b: marker at the START of the text item, followed only by spaces/underscores.
        // The trailing chars are visual fill guides (e.g. {nome}___________ in a contract template).
        // Use the FULL item width as rectW so the replacement value is never shrunk to fit a narrow slot.
        // isFullWidth=true: rightExtension must be 0 — static text may follow immediately after the underscores.
        if (str.startsWith(marker) && /^[\s_]+$/.test(str.slice(marker.length))) {
          const w = totalW > 0 ? totalW : Math.abs(str.length * (h * 0.55));
          positions.push({ marker, pageIndex: p - 1, x, y, width: w, height: h, isStandalone: true, isFullWidth: true });
          continue;
        }

        // Case 2: marker embedded within a longer text item
        // Use proportional character-width to approximate x and width of the marker.
        const idx = str.indexOf(marker);
        if (idx !== -1 && totalW > 0) {
          const charW = totalW / str.length;
          const markerX = x + idx * charW;
          const markerW = marker.length * charW;
          positions.push({ marker, pageIndex: p - 1, x: markerX, y, width: markerW, height: h, isStandalone: false, isFullWidth: false });
          continue;
        }

        // Case 3: marker split across two consecutive text items (word-wrap in table cells)
        // Check if current item ends with a prefix of the marker AND next item starts with the remainder.
        if (i + 1 < items.length) {
          const next = items[i + 1];
          const combined = str + next.str;
          const cidx = combined.indexOf(marker);
          if (cidx !== -1 && cidx < str.length && cidx + marker.length > str.length) {
            // Marker starts in current item — use current item's position as anchor
            const charW = totalW > 0 ? totalW / str.length : h * 0.55;
            const markerX = x + cidx * charW;
            // Width spans into next item — approximate conservatively
            const markerW = marker.length * charW;
            positions.push({ marker, pageIndex: p - 1, x: markerX, y, width: markerW, height: h, isStandalone: false, isFullWidth: false });
          }
        }
      }
    }

    // Erase trailing underscore/dash sequences on lines that contain a marker.
    // These are template fill-in decorations (underlines) that remain visible after substitution.
    if (eraseTrailingUnderscores) {
      const pagePositions = positions.filter(pos => pos.pageIndex === p - 1);
      if (pagePositions.length > 0) {
        for (const item of items) {
          const { str, transform, width: iw, height: ih } = item;
          // Match items composed only of underscores, dashes, dots, spaces — with at least one _ or -
          if (!/^[_ \-.]+$/.test(str) || !/[_\-]/.test(str)) continue;
          const [, , , scaleY, ix, iy] = transform;
          const h = Math.abs(ih ?? scaleY ?? 12);
          const w = iw > 0 ? iw : str.length * h * 0.6;
          // Only erase if on the same horizontal line as a found marker
          const onSameLine = pagePositions.some(mp => Math.abs(mp.y - iy) < h * 1.5);
          if (onSameLine) {
            positions.push({ marker: '__ERASE__', pageIndex: p - 1, x: ix, y: iy, width: w, height: h, isStandalone: false, isFullWidth: false });
          }
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

  const positions = await findMarkerPositions(pdfBuffer, allMarkersToFind, true);
  if (positions.length === 0) return pdfBuffer;

  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  // Use Courier Bold to match the monospace Courier New font used in the PDF templates.
  // This keeps replacement values visually consistent with the surrounding template text.
  const fillFont = await pdfDoc.embedFont(StandardFonts.CourierBold);

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

  // Pre-compute: for each marker position, find the nearest marker to the right on the same line.
  // Used to clamp the right extension of the white rect so we don't cover adjacent markers.
  const realPositions = positions.filter(p => p.marker !== '__ERASE__');

  for (const pos of positions) {
    const page = pages[pos.pageIndex];
    if (!page) continue;

    const rectHeight = Math.max(pos.height, 10);
    // Extend 5 units below baseline to cover underscore descenders inside marker names
    // (e.g. {data_nascita} contains "_" whose glyph descends below the PDF baseline y).
    const rectY = pos.y - 7;
    const rectW = Math.max(pos.width, 20);
    // leftPad: compensates for x estimation error on embedded markers (Case 2/3 — proportional charW).
    // Standalone markers (Case 1/1b) have exact x from pdfjs — no padding to avoid erasing preceding text.
    const leftPad = pos.isStandalone ? 0 : 8;

    // Right extension: cover trailing underscore decorations after standalone markers.
    // - Case 1b (isFullWidth): underscores are already part of rectW — extend 0 to avoid erasing
    //   static text that immediately follows (e.g. "il", "n.", "codice fiscale").
    // - Case 2/3 (embedded): static text follows immediately — extend 0.
    // - Case 1 (exact standalone): space to the right is typically free — extend up to 60 units.
    let rightExtension = 0;
    if (pos.isStandalone && !pos.isFullWidth) {
      const rightNeighbors = realPositions.filter(p =>
        p !== pos &&
        p.pageIndex === pos.pageIndex &&
        Math.abs(p.y - pos.y) < rectHeight * 1.5 &&
        p.x > pos.x + rectW,
      );
      rightExtension = rightNeighbors.length > 0
        ? Math.max(0, Math.min(...rightNeighbors.map(p => p.x)) - (pos.x + rectW) - 5)
        : 60;
    }

    // 1. White rectangle to cover the marker text + trailing decorations
    page.drawRectangle({
      x: pos.x - leftPad,
      y: rectY,
      width: rectW + leftPad + rightExtension,
      height: rectHeight + 12,
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
        // Start at the natural size, then shrink until the text fits within rectW.
        // This prevents long values (e.g. codice fiscale) from overflowing into
        // adjacent template text.
        let fontSize = Math.max(7, Math.min(rectHeight, 12));
        while (fontSize > 5 && fillFont.widthOfTextAtSize(value, fontSize) > rectW) {
          fontSize -= 0.5;
        }
        page.drawText(value, {
          x: pos.x,
          y: pos.y,
          size: fontSize,
          font: fillFont,
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
  '{citta_nascita}',
  '{citta_residenza}',
  '{data_nascita}',
  '{codice_fiscale}',
  '{totale_lordo_liquidato}',
  '{totale_ritenuta_acconto_liquidato}',
  '{totale_netto_liquidato}',
  '{data_corrente}',
  '{firma}',
];
