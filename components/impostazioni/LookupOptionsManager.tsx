'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Option {
  id: string;
  nome: string;
  sort_order: number;
}

interface Props {
  type: 'citta' | 'materia';
  label: string;
  initialOptions: {
    testbusters: Option[];
    peer4med: Option[];
  };
}

function CommunityColumn({
  communityKey,
  communityLabel,
  type,
  initialOptions,
}: {
  communityKey: 'testbusters' | 'peer4med';
  communityLabel: string;
  type: string;
  initialOptions: Option[];
}) {
  const [options, setOptions] = useState<Option[]>(initialOptions);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newValue, setNewValue] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = (opt: Option) => {
    setEditingId(opt.id);
    setEditValue(opt.nome);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleRename = async (id: string) => {
    if (!editValue.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/lookup-options/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: editValue.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'Errore');
      }
      const { option } = await res.json();
      setOptions((prev) => prev.map((o) => (o.id === id ? option : o)));
      setEditingId(null);
      toast.success('Opzione aggiornata');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/lookup-options/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Errore eliminazione');
      setOptions((prev) => prev.filter((o) => o.id !== id));
      toast.success('Opzione rimossa');
    } catch {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/lookup-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, community: communityKey, nome: newValue.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'Errore');
      }
      const { option } = await res.json();
      setOptions((prev) => [...prev, option]);
      setNewValue('');
      toast.success('Opzione aggiunta');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore durante l\'aggiunta');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 min-w-0">
      <div className="px-4 py-2.5 border-b border-border bg-muted/40">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {communityLabel}
        </p>
      </div>

      <ul className="divide-y divide-border">
        {options.map((opt) => (
          <li key={opt.id} className="flex items-center gap-2 px-4 py-2.5">
            {editingId === opt.id ? (
              <>
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="h-7 text-sm flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(opt.id);
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  autoFocus
                  disabled={saving}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => handleRename(opt.id)}
                  disabled={saving}
                  aria-label="Salva"
                >
                  <Check size={13} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={cancelEdit}
                  aria-label="Annulla"
                >
                  <X size={13} />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-foreground">{opt.nome}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                  onClick={() => startEdit(opt)}
                  aria-label={`Modifica ${opt.nome}`}
                >
                  <Pencil size={12} />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                      aria-label={`Elimina ${opt.nome}`}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Elimina opzione</AlertDialogTitle>
                      <AlertDialogDescription>
                        Sei sicuro di voler eliminare &ldquo;{opt.nome}&rdquo;? I collaboratori che hanno già questa opzione selezionata manterranno il valore salvato.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(opt.id)}
                        className="bg-destructive hover:bg-destructive/90 text-white"
                      >
                        Elimina
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </li>
        ))}
        {options.length === 0 && (
          <li className="px-4 py-4 text-xs text-muted-foreground italic">Nessuna opzione</li>
        )}
      </ul>

      <div className="px-4 py-3 border-t border-border flex items-center gap-2">
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Nuova opzione…"
          className="h-8 text-sm flex-1"
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          disabled={saving}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAdd}
          disabled={saving || !newValue.trim()}
          className="shrink-0 text-xs"
        >
          <Plus size={13} className="mr-1" />
          Aggiungi
        </Button>
      </div>
    </div>
  );
}

export default function LookupOptionsManager({ type, label, initialOptions }: Props) {
  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">{label}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gestisci le opzioni disponibili per Testbusters e Peer4Med.
        </p>
      </div>
      <div className="flex divide-x divide-border">
        <CommunityColumn
          communityKey="testbusters"
          communityLabel="Testbusters"
          type={type}
          initialOptions={initialOptions.testbusters}
        />
        <CommunityColumn
          communityKey="peer4med"
          communityLabel="Peer4Med"
          type={type}
          initialOptions={initialOptions.peer4med}
        />
      </div>
    </div>
  );
}
