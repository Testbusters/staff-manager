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

  // Polyfill DOMMatrix for Node.js serverless (Vercel) — pdfjs-dist v5 references it
  // at module load time. Node.js does not provide DOMMatrix natively.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (globalThis as any).DOMMatrix === 'undefined') {
    // Minimal 2D affine transform matrix — covers pdfjs-dist text extraction needs.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).DOMMatrix = class DOMMatrix {
      m11: number; m12: number; m13 = 0; m14 = 0;
      m21: number; m22: number; m23 = 0; m24 = 0;
      m31 = 0; m32 = 0; m33 = 1; m34 = 0;
      m41: number; m42: number; m43 = 0; m44 = 1;
      is2D = true; isIdentity: boolean;
      get a() { return this.m11; } set a(v: number) { this.m11 = v; }
      get b() { return this.m12; } set b(v: number) { this.m12 = v; }
      get c() { return this.m21; } set c(v: number) { this.m21 = v; }
      get d() { return this.m22; } set d(v: number) { this.m22 = v; }
      get e() { return this.m41; } set e(v: number) { this.m41 = v; }
      get f() { return this.m42; } set f(v: number) { this.m42 = v; }
      constructor(init?: string | number[]) {
        if (Array.isArray(init) && init.length === 6) {
          [this.m11, this.m12, this.m21, this.m22, this.m41, this.m42] = init;
        } else if (Array.isArray(init) && init.length === 16) {
          [this.m11, this.m12, , , this.m21, this.m22, , , , , , , this.m41, this.m42] = init;
        } else {
          this.m11 = 1; this.m12 = 0; this.m21 = 0; this.m22 = 1; this.m41 = 0; this.m42 = 0;
        }
        this.isIdentity = this.m11 === 1 && this.m12 === 0 && this.m21 === 0 && this.m22 === 1 && this.m41 === 0 && this.m42 === 0;
      }
      multiply(other: any) {
        const r = new DOMMatrix();
        r.m11 = this.m11 * other.m11 + this.m12 * other.m21;
        r.m12 = this.m11 * other.m12 + this.m12 * other.m22;
        r.m21 = this.m21 * other.m11 + this.m22 * other.m21;
        r.m22 = this.m21 * other.m12 + this.m22 * other.m22;
        r.m41 = this.m41 * other.m11 + this.m42 * other.m21 + other.m41;
        r.m42 = this.m41 * other.m12 + this.m42 * other.m22 + other.m42;
        return r;
      }
      inverse() {
        const det = this.m11 * this.m22 - this.m12 * this.m21;
        if (det === 0) return new DOMMatrix();
        const r = new DOMMatrix();
        r.m11 = this.m22 / det; r.m12 = -this.m12 / det;
        r.m21 = -this.m21 / det; r.m22 = this.m11 / det;
        r.m41 = (this.m21 * this.m42 - this.m22 * this.m41) / det;
        r.m42 = (this.m12 * this.m41 - this.m11 * this.m42) / det;
        return r;
      }
      transformPoint(p: { x: number; y: number }) {
        return { x: this.m11 * p.x + this.m21 * p.y + this.m41, y: this.m12 * p.x + this.m22 * p.y + this.m42 };
      }
      translate(tx: number, ty: number) { return this.multiply(new DOMMatrix([1, 0, 0, 1, tx, ty])); }
      scale(sx: number, sy?: number) { return this.multiply(new DOMMatrix([sx, 0, 0, sy ?? sx, 0, 0])); }
      toFloat32Array() { return new Float32Array([this.m11,this.m12,this.m13,this.m14,this.m21,this.m22,this.m23,this.m24,this.m31,this.m32,this.m33,this.m34,this.m41,this.m42,this.m43,this.m44]); }
      toFloat64Array() { return new Float64Array([this.m11,this.m12,this.m13,this.m14,this.m21,this.m22,this.m23,this.m24,this.m31,this.m32,this.m33,this.m34,this.m41,this.m42,this.m43,this.m44]); }
      toString() { return `matrix(${this.m11}, ${this.m12}, ${this.m21}, ${this.m22}, ${this.m41}, ${this.m42})`; }
      static fromMatrix(other: any) { return new DOMMatrix([other.a ?? other.m11 ?? 1, other.b ?? other.m12 ?? 0, other.c ?? other.m21 ?? 0, other.d ?? other.m22 ?? 1, other.e ?? other.m41 ?? 0, other.f ?? other.m42 ?? 0]); }
      static fromFloat32Array(a: Float32Array) { return new DOMMatrix(Array.from(a)); }
      static fromFloat64Array(a: Float64Array) { return new DOMMatrix(Array.from(a)); }
    };
  }

  // Pre-import the worker module and register it on globalThis BEFORE importing pdf.mjs.
  // pdfjs-dist's fake worker (used in Node.js) calls `import(this.workerSrc)` with a
  // variable path ("./pdf.worker.mjs"). Next.js standalone output traces only static
  // imports — the worker file is missing from Vercel's deployment bundle.
  // Setting globalThis.pdfjsWorker makes pdfjs-dist use it directly (via
  // PDFWorker.#mainThreadWorkerMessageHandler), bypassing the broken dynamic import.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(globalThis as any).pdfjsWorker) {
    // @ts-ignore — no type declarations for this path
    const workerModule = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).pdfjsWorker = workerModule;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // @ts-ignore — no type declarations for this path
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs') as any;

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
        // Also extend coverage to include any consecutive underscores immediately following
        // the marker within the same item (template fill guides, e.g. {nome}________).
        const idx = str.indexOf(marker);
        if (idx !== -1 && totalW > 0) {
          const charW = totalW / str.length;
          const markerX = x + idx * charW;
          const afterMarker = str.slice(idx + marker.length);
          const trailingUnderscores = afterMarker.match(/^[_]+/);
          const coverLen = marker.length + (trailingUnderscores ? trailingUnderscores[0].length : 0);
          const markerW = coverLen * charW;
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

            // Erase the continuation fragment on the next line (word-wrap remainder).
            // The replacement text is drawn at the first-line position above; the second
            // line shows only the tail of the marker string (e.g. "quidato}") which must
            // be whited-out. Use __ERASE__ so the fill loop covers it without drawing text.
            const nextH = Math.abs(next.height ?? h);
            const nextW = next.width > 0 ? next.width : next.str.length * nextH * 0.6;
            const [,,,, nextX, nextY] = next.transform as number[];
            positions.push({ marker: '__ERASE__', pageIndex: p - 1, x: nextX, y: nextY, width: nextW, height: nextH, isStandalone: false, isFullWidth: false });
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
    // 4pt is sufficient for Courier New (monospace) templates — charW estimation is very accurate for
    // fixed-width fonts, so a large pad is unnecessary and would erase adjacent label characters.
    const leftPad = pos.isStandalone ? 0 : 4;

    // Right extension: always 0.
    // Trailing underscore/dash decorations that appear as standalone items on the same line are
    // erased by the __ERASE__ pass (eraseTrailingUnderscores=true). Extending the white rect to the
    // right risks erasing static label text that sits between two markers on the same line
    // (e.g. "nato/a a" in receipt, "n." in contract). The eraseTrailingUnderscores pass is the
    // correct tool for decorations; rightExtension is not needed.
    const rightExtension = 0;

    // 1. White rectangle to cover the marker text + trailing decorations
    page.drawRectangle({
      x: pos.x - leftPad,
      y: rectY,
      width: rectW + leftPad + rightExtension,
      height: rectHeight + 7,
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
