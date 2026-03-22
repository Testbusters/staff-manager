'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  corsoId: string;
  cittaList: string[];
}

export default function CandidatureCittaTab({ corsoId, cittaList }: Props) {
  const [selectedCitta, setSelectedCitta] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign() {
    if (!selectedCitta) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/corsi/${corsoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ citta: selectedCitta }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(typeof json.error === 'string' ? json.error : 'Errore durante il salvataggio');
        return;
      }
      setSaved(true);
    } catch {
      setError('Errore di rete');
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="rounded-2xl bg-card border border-border p-6 max-w-md">
        <p className="text-sm text-green-700 dark:text-green-400 font-medium">
          Città assegnata: <strong>{selectedCitta}</strong>. Il corso non è più aperto a candidatura.
        </p>
        <Button variant="outline" className="mt-3" onClick={() => window.location.reload()}>
          Aggiorna pagina
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="rounded-2xl bg-card border border-border p-6">
        <h3 className="text-sm font-medium text-foreground mb-1">Assegna città</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Questo corso è attualmente aperto a candidatura di città. Seleziona una città per assegnarlo definitivamente.
          Le candidature dei responsabili cittadino saranno visibili qui dopo l&apos;attivazione della sezione.
        </p>

        <EmptyState
          icon={MapPin}
          title="Nessuna candidatura ancora"
          description="I responsabili cittadino potranno candidarsi da questa funzionalità in un aggiornamento futuro."
        />

        <div className="mt-6 border-t border-border pt-4">
          <p className="text-sm font-medium text-foreground mb-2">Assegnazione manuale</p>
          <div className="flex gap-3">
            <Select value={selectedCitta} onValueChange={setSelectedCitta}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Seleziona città" />
              </SelectTrigger>
              <SelectContent>
                {cittaList.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAssign}
              disabled={!selectedCitta || saving}
              className="bg-brand hover:bg-brand/90 text-white"
            >
              {saving ? 'Salvataggio…' : 'Assegna'}
            </Button>
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
