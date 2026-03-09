'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReceiptGenerationModal from './ReceiptGenerationModal';

export default function CodaReceiptButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="bg-brand hover:bg-brand/90 text-white shrink-0"
      >
        <FileText className="h-3.5 w-3.5 mr-1.5" />
        Genera ricevute
      </Button>
      <ReceiptGenerationModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
