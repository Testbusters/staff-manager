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

    // Step 4: import pdfjs-dist worker
    try {
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
