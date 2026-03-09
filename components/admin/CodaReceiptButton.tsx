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
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="shrink-0"
      >
        <FileText className="h-3.5 w-3.5 mr-1.5" />
        Genera ricevute
      </Button>
      <ReceiptGenerationModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
