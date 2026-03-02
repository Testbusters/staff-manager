'use client';

import { useState } from 'react';

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
      className="rounded-md bg-gray-700 border border-gray-600 hover:bg-gray-600 px-3 py-1.5 text-xs font-medium text-gray-200 transition"
    >
      {copied ? '✓ Copiato' : label}
    </button>
  );
}
