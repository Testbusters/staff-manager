'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { Compensation } from '@/lib/types';

type Competenza = { key: string; label: string };

interface CompensationEditModalProps {
  open: boolean;
  compensation: Compensation;
  onClose: () => void;
  onSuccess: () => void;
}

function formatDateInput(iso: string | null | undefined) {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export default function CompensationEditModal({
  open,
  compensation,
  onClose,
  onSuccess,
}: CompensationEditModalProps) {
  const [importo_lordo, setImportoLordo] = useState('');
  const [ritenuta_acconto, setRitenutaAcconto] = useState('');
  const [data_competenza, setDataCompetenza] = useState('');
  const [nome_servizio_ruolo, setNomeServizioRuolo] = useState('');
  const [competenza, setCompetenza] = useState('');
  const [info_specifiche, setInfoSpecifiche] = useState('');

  const [competenze, setCompetenze] = useState<Competenza[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when modal opens
  useEffect(() => {
    if (open) {
      setImportoLordo(compensation.importo_lordo?.toString() ?? '');
      setRitenutaAcconto(compensation.ritenuta_acconto?.toString() ?? '');
      setDataCompetenza(formatDateInput(compensation.data_competenza));
      setNomeServizioRuolo(compensation.nome_servizio_ruolo ?? '');
      setCompetenza(compensation.competenza ?? '');
      setInfoSpecifiche(compensation.info_specifiche ?? '');
      setError(null);
    }
  }, [open, compensation]);

  // Fetch competenze on mount
  useEffect(() => {
    fetch('/api/compensations/competenze')
      .then((r) => r.json())
      .then((d) => setCompetenze(d.competenze ?? []))
      .catch(() => {});
  }, []);

  const lordo = parseFloat(importo_lordo) || 0;
  const ritenuta = parseFloat(ritenuta_acconto) || 0;
  const netto = Math.round((lordo - ritenuta) * 100) / 100;

  function handleClose() {
    setError(null);
    onClose();
  }

  async function handleSave() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/compensations/${compensation.id}/edit`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        importo_lordo: lordo,
        ritenuta_acconto: ritenuta,
        data_competenza,
        nome_servizio_ruolo: nome_servizio_ruolo.trim(),
        competenza,
        info_specifiche: info_specifiche.trim(),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Errore durante il salvataggio');
      return;
    }

    onSuccess();
  }

  const isValid =
    lordo > 0 &&
    ritenuta >= 0 &&
    data_competenza.length > 0 &&
    nome_servizio_ruolo.trim().length > 0 &&
    competenza.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground pr-10">
            Modifica compenso
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome servizio/ruolo */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">
              Nome servizio / ruolo <span className="text-red-500">*</span>
            </label>
            <Input
              value={nome_servizio_ruolo}
              onChange={(e) => setNomeServizioRuolo(e.target.value)}
              placeholder="Es. Esaminatore CILS B2"
            />
          </div>

          {/* Data competenza */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">
              Data competenza <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={data_competenza}
              onChange={(e) => setDataCompetenza(e.target.value)}
            />
          </div>

          {/* Competenza */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">
              Competenza <span className="text-red-500">*</span>
            </label>
            <Select value={competenza} onValueChange={setCompetenza}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona competenza" />
              </SelectTrigger>
              <SelectContent>
                {competenze.map((c) => (
                  <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Importo lordo + ritenuta */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">
                Importo lordo (€) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={importo_lordo}
                onChange={(e) => setImportoLordo(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">
                Ritenuta acconto (€) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={ritenuta_acconto}
                onChange={(e) => setRitenutaAcconto(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Importo netto (computed) */}
          {lordo > 0 && (
            <p className="text-xs text-muted-foreground">
              Importo netto:{' '}
              <span className="text-foreground font-medium">
                {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(netto)}
              </span>
            </p>
          )}

          {/* Info specifiche */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">
              Info specifiche
            </label>
            <Textarea
              value={info_specifiche}
              onChange={(e) => setInfoSpecifiche(e.target.value)}
              rows={3}
              placeholder="Note aggiuntive (opzionale)"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/40 px-3 py-2 text-xs text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || !isValid}
              className="bg-brand hover:bg-blue-500 text-white"
            >
              {loading ? 'Salvataggio…' : 'Salva'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
