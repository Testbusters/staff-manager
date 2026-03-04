"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to an error reporting service if one is added in future
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-red-900/40 mb-6">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-gray-100 mb-2">Qualcosa è andato storto</h1>
        <p className="text-sm text-gray-500 mb-8">
          Si è verificato un errore imprevisto. Riprova o contatta l&apos;amministrazione se il problema persiste.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-500
                       px-4 py-2.5 text-sm font-medium text-white transition"
          >
            Riprova
          </button>
          <a
            href="/"
            className="text-sm text-gray-500 hover:text-gray-400 transition"
          >
            Torna alla home
          </a>
        </div>
      </div>
    </div>
  );
}
