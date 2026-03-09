'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onClose: () => void;
  url: string | null;
  title: string;
}

export default function DocumentViewer({ open, onClose, url, title }: Props) {
  const [iframeError, setIframeError] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-sm font-medium text-foreground pr-8">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 relative overflow-hidden">
          {!url ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              URL documento non disponibile
            </div>
          ) : iframeError ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-sm text-muted-foreground">
              <p>Impossibile visualizzare il documento nell&apos;anteprima.</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link hover:text-link/80 underline"
              >
                Scarica il PDF
              </a>
            </div>
          ) : (
            <iframe
              src={url}
              className="w-full h-full border-0"
              title={title}
              onError={() => setIframeError(true)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
