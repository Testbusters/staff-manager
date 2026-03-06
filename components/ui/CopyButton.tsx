'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

export default function CopyButton({ text, label = 'Copia' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded-md bg-muted border border-border hover:bg-accent px-3 py-1.5 text-xs font-medium text-foreground transition"
    >
      {copied ? <><Check className="h-3.5 w-3.5 inline mr-1" />Copiato</> : label}
    </button>
  );
}
