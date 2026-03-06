'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  initialAvatarUrl: string | null;
  initials: string;
  fullName: string;
  roleLabel: string;
  todayStr: string;
}

export default function ResponsabileAvatarHero({
  initialAvatarUrl,
  initials,
  fullName,
  roleLabel,
  todayStr,
}: Props) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const fileInputRef              = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/profile/avatar', { method: 'POST', body: formData });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'Errore caricamento foto'); return; }
    setAvatarUrl(data.url);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="relative group flex-shrink-0">
          <div className="w-14 h-14 rounded-full bg-accent overflow-hidden flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-medium text-foreground select-none">{initials}</span>
            )}
          </div>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Ciao{fullName ? `, ${fullName}` : ''}!
          </h1>
          <span className="mt-1.5 inline-flex items-center rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs text-foreground">
            {roleLabel}
          </span>
          <div className="mt-2 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => fileInputRef.current?.click()}
              className="text-xs h-7"
            >
              {loading ? 'Caricamento…' : 'Cambia foto'}
            </Button>
            <span className="text-xs text-muted-foreground">JPG, PNG o WebP · max 2 MB</span>
          </div>
          {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}
        </div>
      </div>
      <p className="shrink-0 pt-1 text-right text-sm text-muted-foreground">{todayStr}</p>
    </div>
  );
}
