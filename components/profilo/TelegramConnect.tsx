'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TelegramConnectProps {
  telegram_connected: boolean;
}

export default function TelegramConnect({ telegram_connected }: TelegramConnectProps) {
  const [connected, setConnected] = useState(telegram_connected);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/telegram/connect', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Errore durante la connessione');
        return;
      }
      const { deep_link } = await res.json();
      window.open(deep_link, '_blank', 'noopener,noreferrer');
      // Optimistically mark as pending — actual connection confirmed by bot
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/telegram/disconnect', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Errore durante la disconnessione');
        return;
      }
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${connected ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
        <span className="text-sm text-foreground">
          {connected ? 'Account Telegram collegato' : 'Nessun account Telegram collegato'}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        {connected
          ? 'Ricevi notifiche su Telegram per assegnazioni, nuovi corsi e promemoria lezioni.'
          : 'Collega il tuo account Telegram per ricevere notifiche sui corsi direttamente in chat.'}
      </p>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {connected ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          disabled={loading}
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {loading ? 'In corso...' : 'Disconnetti Telegram'}
        </Button>
      ) : (
        <Button
          size="sm"
          className="bg-brand hover:bg-brand/90 text-white"
          onClick={handleConnect}
          disabled={loading}
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {loading ? 'In corso...' : 'Connetti Telegram'}
        </Button>
      )}
    </div>
  );
}
