'use client';

import { useState, useCallback } from 'react';
import { UserX, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { BlacklistEntry } from '@/lib/types';

interface SearchResult {
  id: string;
  username: string | null;
  nome: string | null;
  cognome: string | null;
}

export default function BlacklistManager() {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Search state
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/blacklist');
    if (res.ok) {
      const json = await res.json();
      setEntries(json.entries ?? []);
    }
    setLoaded(true);
    setLoading(false);
  }, []);

  // Lazy load on mount (first render)
  if (!loaded && !loading) {
    loadEntries();
  }

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    const res = await fetch(`/api/admin/collaboratori?q=${encodeURIComponent(query)}&active_only=false`);
    if (res.ok) {
      const json = await res.json();
      setSearchResults(
        (json.collaboratori ?? []).slice(0, 10).map((c: {
          id: string;
          username: string | null;
          nome: string | null;
          cognome: string | null;
        }) => ({
          id: c.id,
          username: c.username,
          nome: c.nome,
          cognome: c.cognome,
        })),
      );
    }
    setSearching(false);
  }

  async function handleAdd(collaboratorId: string) {
    setAdding(true);
    setAddError(null);
    const res = await fetch('/api/admin/blacklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collaborator_id: collaboratorId, note: note || null }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAddError(typeof json.error === 'string' ? json.error : 'Errore durante l\'aggiunta');
    } else {
      await loadEntries();
      setSearchResults([]);
      setQuery('');
      setNote('');
    }
    setAdding(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/blacklist/${id}`, { method: 'DELETE' });
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setDeleteId(null);
  }

  function displayName(e: BlacklistEntry) {
    if (!e.collaborator) return e.collaborator_id;
    const { nome, cognome, username } = e.collaborator;
    if (nome && cognome) return `${nome} ${cognome}`;
    return username ?? e.collaborator_id;
  }

  return (
    <div className="space-y-6">
      {/* Add section */}
      <div className="rounded-2xl bg-card border border-border p-5">
        <h2 className="text-sm font-medium text-foreground mb-1">Aggiungi a blacklist</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Cerca un collaboratore per username o nome e aggiungilo alla blacklist.
        </p>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Cerca collaboratore…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button variant="outline" onClick={handleSearch} disabled={searching}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="rounded-lg border border-border divide-y divide-border mb-3">
            {searchResults.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2">
                <div>
                  <span className="text-sm font-medium text-foreground">
                    {r.nome && r.cognome ? `${r.nome} ${r.cognome}` : r.username ?? r.id}
                  </span>
                  {r.username && (
                    <span className="text-xs text-muted-foreground ml-2">@{r.username}</span>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAdd(r.id)}
                  disabled={adding}
                  className="bg-brand hover:bg-brand/90 text-white"
                >
                  Aggiungi
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Nota (opzionale)</label>
          <Input
            placeholder="Motivo della blacklist…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {addError && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-2">{addError}</p>
        )}
      </div>

      {/* List section */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Collaboratori in blacklist</h2>
        </div>

        {loading && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">Caricamento…</div>
        )}

        {!loading && entries.length === 0 && (
          <div className="px-5 py-8">
            <EmptyState
              icon={UserX}
              title="Nessun collaboratore in blacklist"
              description="La blacklist è vuota."
            />
          </div>
        )}

        {!loading && entries.length > 0 && (
          <Table className="w-auto">
            <TableHeader>
              <TableRow>
                <TableHead>Collaboratore</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Data aggiunta</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id} className="hover:bg-muted/60">
                  <TableCell className="font-medium">{displayName(e)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {e.note ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(e.created_at).toLocaleDateString('it-IT')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Rimuovi da blacklist"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => setDeleteId(e.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovi da blacklist</AlertDialogTitle>
            <AlertDialogDescription>
              Il collaboratore verrà rimosso dalla blacklist. Questa operazione è reversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
              Rimuovi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
