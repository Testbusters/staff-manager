import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Temporary diagnostic endpoint — remove after fixing contract generation bug.
// Tests each step of the PDF generation pipeline and returns detailed results.

export async function GET() {
  const steps: { step: string; ok: boolean; detail: string }[] = [];

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Step 1: template query
  try {
    const { data: tplRow, error: tplErr } = await admin
      .from('contract_templates')
      .select('file_url')
      .eq('tipo', 'OCCASIONALE')
      .maybeSingle();
    steps.push({ step: '1_template_query', ok: !!tplRow, detail: tplRow ? `file_url=${tplRow.file_url}` : `error=${tplErr?.message ?? 'no row'}` });
    if (!tplRow) return NextResponse.json({ steps });

    // Step 2: extract storage path
    let storagePath = tplRow.file_url as string;
    const bucketMarker = '/contracts/';
    const markerIdx = storagePath.indexOf(bucketMarker);
    if (markerIdx !== -1) {
      storagePath = storagePath.slice(markerIdx + bucketMarker.length);
    }
    steps.push({ step: '2_storage_path', ok: true, detail: storagePath });

    // Step 3: download template from storage
    const { data: blob, error: downloadErr } = await admin.storage
      .from('contracts')
      .download(storagePath);
    steps.push({ step: '3_download', ok: !!blob, detail: blob ? `size=${blob.size}` : `error=${downloadErr?.message ?? 'blob null'}` });
    if (!blob) return NextResponse.json({ steps });

    const templateBuffer = Buffer.from(await blob.arrayBuffer());
    steps.push({ step: '3b_buffer', ok: true, detail: `${templateBuffer.length} bytes` });

    // Step 4: import pdfjs-dist worker (with DOMMatrix polyfill)
    try {
      // Polyfill DOMMatrix — pdfjs-dist v5 references it at module load time
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof (globalThis as any).DOMMatrix === 'undefined') {
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
            if (Array.isArray(init) && init.length === 6) { [this.m11, this.m12, this.m21, this.m22, this.m41, this.m42] = init; }
            else if (Array.isArray(init) && init.length === 16) { [this.m11, this.m12, , , this.m21, this.m22, , , , , , , this.m41, this.m42] = init; }
            else { this.m11 = 1; this.m12 = 0; this.m21 = 0; this.m22 = 1; this.m41 = 0; this.m42 = 0; }
            this.isIdentity = this.m11 === 1 && this.m12 === 0 && this.m21 === 0 && this.m22 === 1 && this.m41 === 0 && this.m42 === 0;
          }
          multiply(other: any) { const r = new DOMMatrix(); r.m11=this.m11*other.m11+this.m12*other.m21; r.m12=this.m11*other.m12+this.m12*other.m22; r.m21=this.m21*other.m11+this.m22*other.m21; r.m22=this.m21*other.m12+this.m22*other.m22; r.m41=this.m41*other.m11+this.m42*other.m21+other.m41; r.m42=this.m41*other.m12+this.m42*other.m22+other.m42; return r; }
          inverse() { const det=this.m11*this.m22-this.m12*this.m21; if(!det) return new DOMMatrix(); const r=new DOMMatrix(); r.m11=this.m22/det; r.m12=-this.m12/det; r.m21=-this.m21/det; r.m22=this.m11/det; r.m41=(this.m21*this.m42-this.m22*this.m41)/det; r.m42=(this.m12*this.m41-this.m11*this.m42)/det; return r; }
          transformPoint(p:{x:number;y:number}) { return {x:this.m11*p.x+this.m21*p.y+this.m41,y:this.m12*p.x+this.m22*p.y+this.m42}; }
          translate(tx:number,ty:number) { return this.multiply(new DOMMatrix([1,0,0,1,tx,ty])); }
          scale(sx:number,sy?:number) { return this.multiply(new DOMMatrix([sx,0,0,sy??sx,0,0])); }
          toString() { return `matrix(${this.m11},${this.m12},${this.m21},${this.m22},${this.m41},${this.m42})`; }
          static fromMatrix(o:any) { return new DOMMatrix([o.a??o.m11??1,o.b??o.m12??0,o.c??o.m21??0,o.d??o.m22??1,o.e??o.m41??0,o.f??o.m42??0]); }
          static fromFloat32Array(a:Float32Array) { return new DOMMatrix(Array.from(a)); }
          static fromFloat64Array(a:Float64Array) { return new DOMMatrix(Array.from(a)); }
        };
      }
      steps.push({ step: '4a_dommatrix_polyfill', ok: true, detail: 'DOMMatrix polyfilled' });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(globalThis as any).pdfjsWorker) {
        // @ts-ignore
        const workerModule = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).pdfjsWorker = workerModule;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasHandler = !!(globalThis as any).pdfjsWorker?.WorkerMessageHandler;
      steps.push({ step: '4_worker_import', ok: hasHandler, detail: `WorkerMessageHandler=${hasHandler}` });
    } catch (workerErr) {
      steps.push({ step: '4_worker_import', ok: false, detail: `CATCH: ${workerErr instanceof Error ? workerErr.message : String(workerErr)}` });
      return NextResponse.json({ steps });
    }

    // Step 5: import pdfjs-dist main
    let pdfjsLib: any;
    try {
      // @ts-ignore
      pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs') as any;
      steps.push({ step: '5_pdfjs_import', ok: true, detail: `getDocument=${typeof pdfjsLib.getDocument}` });
    } catch (pdfjsErr) {
      steps.push({ step: '5_pdfjs_import', ok: false, detail: `CATCH: ${pdfjsErr instanceof Error ? pdfjsErr.message : String(pdfjsErr)}` });
      return NextResponse.json({ steps });
    }

    // Step 6: parse PDF with pdfjs
    try {
      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(templateBuffer),
        useSystemFonts: true,
        disableFontFace: true,
      }).promise;
      steps.push({ step: '6_pdf_parse', ok: true, detail: `numPages=${pdf.numPages}` });

      // Step 6b: extract text from first page
      const page = await pdf.getPage(1);
      const textContent = await page.getTextContent();
      const itemCount = textContent.items?.length ?? 0;
      steps.push({ step: '6b_text_extract', ok: itemCount > 0, detail: `items=${itemCount}` });
    } catch (parseErr) {
      steps.push({ step: '6_pdf_parse', ok: false, detail: `CATCH: ${parseErr instanceof Error ? `${parseErr.message}\n${parseErr.stack}` : String(parseErr)}` });
      return NextResponse.json({ steps });
    }

    // Step 7: full fillPdfMarkers
    try {
      const { fillPdfMarkers } = await import('@/lib/pdf-utils');
      const testVars: Record<string, string> = {
        '{nome}': 'TEST',
        '{cognome}': 'DIAG',
        '{data_corrente}': '10/04/2026',
      };
      const result = await fillPdfMarkers(templateBuffer, testVars);
      steps.push({ step: '7_fillPdfMarkers', ok: result.length > 0, detail: `output=${result.length} bytes` });
    } catch (fillErr) {
      steps.push({ step: '7_fillPdfMarkers', ok: false, detail: `CATCH: ${fillErr instanceof Error ? `${fillErr.message}\n${fillErr.stack}` : String(fillErr)}` });
    }

  } catch (err) {
    steps.push({ step: 'OUTER_CATCH', ok: false, detail: `${err instanceof Error ? `${err.message}\n${err.stack}` : String(err)}` });
  }

  return NextResponse.json({ steps });
}
