'use client';

import { useEffect } from 'react';
import { ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppError({
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
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
      <ServerCrash className="h-12 w-12 text-muted-foreground" />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Errore del server</h1>
        <p className="text-muted-foreground max-w-sm">
          Si è verificato un errore imprevisto. Riprova o contatta l&apos;amministrazione se il problema persiste.
        </p>
      </div>
      <div className="flex flex-col gap-3 items-center">
        <Button className="bg-brand hover:bg-brand/90 text-white" onClick={reset}>
          Riprova
        </Button>
        <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition">
          Torna alla home
        </a>
      </div>
    </div>
  );
}
