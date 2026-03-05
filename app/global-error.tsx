"use client";

import { useEffect } from "react";

// Catches errors in the root layout — must include <html> and <body>
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="it" className="dark">
      <body className="bg-background text-foreground">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-sm text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-red-900/40 mb-6">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-foreground mb-2">Errore critico</h1>
            <p className="text-sm text-muted-foreground mb-8">
              L&apos;applicazione non è riuscita a caricarsi correttamente. Riprova o contatta l&apos;amministrazione.
            </p>
            <button
              onClick={reset}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-500
                         px-4 py-2.5 text-sm font-medium text-white transition"
            >
              Riprova
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
