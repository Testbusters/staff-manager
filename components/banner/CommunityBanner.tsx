'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RichTextDisplay from '@/components/ui/RichTextDisplay';

interface Props {
  communityId: string;
  content: string;
  linkUrl: string | null;
  linkLabel: string | null;
  updatedAt: string;
}

export default function CommunityBanner({ communityId, content, linkUrl, linkLabel, updatedAt }: Props) {
  const [visible, setVisible] = useState(false);

  const dismissKey = `banner_dismissed_${communityId}_${updatedAt}`;

  useEffect(() => {
    if (!localStorage.getItem(dismissKey)) {
      setVisible(true);
    }
  }, [dismissKey]);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(dismissKey, '1');
    setVisible(false);
  }

  return (
    <div className="flex items-start gap-3 px-4 py-2.5 bg-brand/10 border-b border-brand/20 flex-shrink-0">
      <div className="flex-1 min-w-0">
        <RichTextDisplay html={content} className="[&_p]:mb-0 [&_p]:leading-snug" />
        {linkUrl && (
          <a
            href={linkUrl}
            target={linkUrl.startsWith('http') ? '_blank' : undefined}
            rel={linkUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="inline-block mt-1 text-xs font-medium text-link hover:text-link/80 underline"
          >
            {linkLabel || 'Scopri di più'}
          </a>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Chiudi banner"
        className="shrink-0 h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={dismiss}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
