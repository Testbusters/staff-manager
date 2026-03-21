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
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-3 px-4 py-2.5 bg-brand/10 border-b border-brand/20 border-l-4 border-l-brand/40 flex-shrink-0 animate-in slide-in-from-top-2 duration-300"
    >
      <div className="flex-1 min-w-0 max-h-24 overflow-y-auto">
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
        className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={dismiss}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
