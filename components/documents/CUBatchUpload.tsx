'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';

interface BatchDetail {
  success: string[];
  duplicates: string[];
  errors: string[];
}

interface BatchResponse {
  processed: number;
  success: number;
  duplicates: number;
  errors: number;
  detail: BatchDetail;
}

export default function CUBatchUpload() {
  const router = useRouter();

  const [zipFile, setZipFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [anno, setAnno] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BatchResponse | null>(null);

  const isValid = zipFile && csvFile && anno && parseInt(anno) >= 2000;

  const handleSubmit = async () => {
    if (!isValid || !zipFile || !csvFile) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('zip', zipFile);
      formData.append('csv', csvFile);
      formData.append('anno', anno);

      const res = await fetch('/api/documents/cu-batch', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore durante il batch import');

      setResult(data as BatchResponse);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl bg-card border border-border p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Importazione CU batch</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Carica lo ZIP con i PDF e il CSV di mapping (formato:{' '}
          <code className="text-muted-foreground">nome_file,nome,cognome</code>).
          Tutti i PDF devono essere CU dello stesso anno fiscale.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/30 border border-red-800/40 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Anno */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5">
          Anno fiscale <span className="text-red-500">*</span>
        </label>
        <Input
          type="number"
          value={anno}
          onChange={(e) => setAnno(e.target.value)}
          placeholder="es. 2025"
          min={2000}
          max={2100}
          className="w-48"
        />
      </div>

      {/* ZIP */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5">
          File ZIP (PDF CU) <span className="text-red-500">*</span>
        </label>
        <input
          type="file"
          accept=".zip"
          onChange={(e) => setZipFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-accent file:text-foreground hover:file:bg-gray-600"
        />
        {zipFile && <p className="mt-1 text-xs text-muted-foreground">{zipFile.name} ({(zipFile.size / 1024).toFixed(0)} KB)</p>}
      </div>

      {/* CSV */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5">
          File CSV mapping <span className="text-red-500">*</span>
        </label>
        <input
          type="file"
          accept=".csv,.txt"
          onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-accent file:text-foreground hover:file:bg-gray-600"
        />
        {csvFile && <p className="mt-1 text-xs text-muted-foreground">{csvFile.name}</p>}
        <p className="mt-1.5 text-xs text-muted-foreground">
          Prima riga: intestazione. Colonne: <code>nome_file,nome,cognome</code>
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!isValid || loading}
        className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition"
      >
        {loading ? 'Elaborazione…' : 'Avvia importazione'}
      </button>

      {/* Results */}
      {result && (
        <div className="space-y-4 border-t border-border pt-5">
          <div className="flex gap-6 text-sm">
            <span className="text-muted-foreground">Elaborati: <strong className="text-foreground">{result.processed}</strong></span>
            <span className="text-green-400">Caricati: <strong>{result.success}</strong></span>
            <span className="text-yellow-400">Duplicati: <strong>{result.duplicates}</strong></span>
            {result.errors > 0 && (
              <span className="text-red-400">Errori: <strong>{result.errors}</strong></span>
            )}
          </div>

          {result.detail.success.length > 0 && (
            <details className="text-xs">
              <summary className="text-green-400 cursor-pointer">Caricati ({result.detail.success.length})</summary>
              <ul className="mt-2 space-y-0.5 text-muted-foreground">
                {result.detail.success.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </details>
          )}

          {result.detail.duplicates.length > 0 && (
            <details className="text-xs">
              <summary className="text-yellow-400 cursor-pointer">Duplicati saltati ({result.detail.duplicates.length})</summary>
              <ul className="mt-2 space-y-0.5 text-muted-foreground">
                {result.detail.duplicates.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </details>
          )}

          {result.detail.errors.length > 0 && (
            <details className="text-xs" open>
              <summary className="text-red-400 cursor-pointer">Errori ({result.detail.errors.length})</summary>
              <ul className="mt-2 space-y-0.5 text-muted-foreground">
                {result.detail.errors.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
