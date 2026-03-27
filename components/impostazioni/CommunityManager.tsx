'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Shield, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Community = { id: string; name: string; is_active: boolean };
type Responsabile = { user_id: string; display_name: string; email: string; communities: { id: string; name: string }[]; can_publish_announcements: boolean };

export default function CommunityManager({
  communities,
  responsabili,
}: {
  communities: Community[];
  responsabili: Responsabile[];
}) {
  const router = useRouter();

  // ── Create community ──────────────────────────────────────
  const [newName, setNewName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreateLoading(true);
    const res = await fetch('/api/admin/communities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setCreateLoading(false);
    if (!res.ok) { const j = await res.json(); toast.error(j.error ?? 'Errore.', { duration: 5000 }); return; }
    toast.success('Community creata.');
    setNewName('');
    router.refresh();
  }

  // ── Rename community ──────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    setEditLoading(true);
    const res = await fetch(`/api/admin/communities/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditLoading(false);
    if (!res.ok) { const j = await res.json(); toast.error(j.error ?? 'Errore.', { duration: 5000 }); return; }
    toast.success('Rinominata.');
    setEditingId(null);
    router.refresh();
  }

  // ── Toggle is_active ──────────────────────────────────────
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<{ id: string; name: string; active: boolean } | null>(null);

  async function doToggle(id: string, active: boolean) {
    setTogglingId(id);
    await fetch(`/api/admin/communities/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !active }),
    });
    setTogglingId(null);
    setConfirmToggle(null);
    router.refresh();
  }

  // ── Responsabile assignment ───────────────────────────────
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedComms, setSelectedComms] = useState<string[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  // ── Publish permission toggle ─────────────────────────────
  const [togglingPublishId, setTogglingPublishId] = useState<string | null>(null);

  function startEditAssignment(resp: Responsabile) {
    setEditingUserId(resp.user_id);
    setSelectedComms(resp.communities.map((c) => c.id));
  }

  async function saveAssignment(userId: string) {
    setAssignLoading(true);
    await fetch(`/api/admin/responsabili/${userId}/communities`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ community_ids: selectedComms }),
    });
    setAssignLoading(false);
    setEditingUserId(null);
    router.refresh();
  }

  async function togglePublish(userId: string, current: boolean) {
    setTogglingPublishId(userId);
    await fetch(`/api/admin/responsabili/${userId}/publish-permission`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ can_publish_announcements: !current }),
    });
    setTogglingPublishId(null);
    router.refresh();
  }

  const activeCommunities = communities.filter((c) => c.is_active);

  return (
    <div className="space-y-8">
      {/* ── Toggle AlertDialog ──────────────────────────────── */}
      <AlertDialog open={!!confirmToggle} onOpenChange={(open) => { if (!open) setConfirmToggle(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmToggle?.active ? 'Disattiva community' : 'Riattiva community'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmToggle?.active
                ? `Disattivare "${confirmToggle.name}"? Sarà nascosta da tutti i menu.`
                : `Riattivare "${confirmToggle?.name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmToggle && doToggle(confirmToggle.id, confirmToggle.active)}
              variant={confirmToggle?.active ? 'destructive' : 'default'}
            >
              {confirmToggle?.active ? 'Disattiva' : 'Riattiva'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Create community ────────────────────────────────── */}
      <div className="rounded-2xl bg-card border border-border">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Crea community</h2>
        </div>
        <div className="p-5">
          <form onSubmit={handleCreate} className="flex gap-3">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome community"
              className="flex-1" />
            <Button type="submit" disabled={createLoading || !newName.trim()} className="bg-brand hover:bg-brand/90 text-white">
              {createLoading ? 'Creazione…' : 'Crea'}
            </Button>
          </form>
        </div>
      </div>

      {/* ── Community list ──────────────────────────────────── */}
      <div className="rounded-2xl bg-card border border-border">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Community esistenti</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Rinomina o disattiva. Le community inattive sono escluse da tutti i menu.</p>
        </div>
        <div className="divide-y divide-border">
          {communities.length === 0 && (
            <EmptyState icon={Users} title="Nessuna community." />
          )}
          {communities.map((c) => (
            <div key={c.id} className="px-5 py-3 flex items-center gap-3">
              {editingId === c.id ? (
                <>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                    className="flex-1" />
                  <Button onClick={() => handleRename(c.id)} disabled={editLoading} size="sm" className="bg-brand hover:bg-brand/90 text-white">
                    Salva
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                    Annulla
                  </Button>
                </>
              ) : (
                <>
                  <span className={`flex-1 text-sm ${c.is_active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                    {c.name}
                  </span>
                  {!c.is_active && (
                    <span className="rounded-full bg-muted border border-border px-2 py-0.5 text-xs text-muted-foreground">Inattiva</span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditingId(c.id); setEditName(c.name); }}
                  >
                    Rinomina
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={togglingId === c.id}
                    onClick={() => setConfirmToggle({ id: c.id, name: c.name, active: c.is_active })}
                    className={c.is_active
                      ? 'text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                      : 'text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20'}
                  >
                    {togglingId === c.id ? '…' : c.is_active ? 'Disattiva' : 'Riattiva'}
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Responsabili assignment ─────────────────────────── */}
      <div className="rounded-2xl bg-card border border-border">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Community per responsabile</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Gestisci quali community sono assegnate a ciascun responsabile.</p>
        </div>
        <div className="divide-y divide-border">
          {responsabili.length === 0 && (
            <EmptyState icon={Shield} title="Nessun responsabile attivo." />
          )}
          {responsabili.map((resp) => (
            <div key={resp.user_id} className="px-5 py-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-foreground">{resp.display_name}</p>
                  <p className="text-xs text-muted-foreground">{resp.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer" title="Abilita pubblicazione annunci">
                    <span className="text-xs text-muted-foreground">Pubblica annunci</span>
                    <button
                      type="button"
                      disabled={togglingPublishId === resp.user_id}
                      onClick={() => togglePublish(resp.user_id, resp.can_publish_announcements)}
                      aria-label={resp.can_publish_announcements ? 'Disabilita pubblicazione annunci' : 'Abilita pubblicazione annunci'}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 ${
                        resp.can_publish_announcements ? 'bg-brand' : 'bg-accent'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        resp.can_publish_announcements ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </label>
                {editingUserId === resp.user_id ? (
                  <div className="flex gap-2">
                    <Button onClick={() => saveAssignment(resp.user_id)} disabled={assignLoading} size="sm" className="bg-brand hover:bg-brand/90 text-white">
                      Salva
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingUserId(null)}>
                      Annulla
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => startEditAssignment(resp)}>
                    Modifica
                  </Button>
                )}
                </div>
              </div>

              {editingUserId === resp.user_id ? (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {activeCommunities.map((c) => (
                    <label key={c.id}
                      className="flex items-center gap-2 rounded-lg bg-muted border border-border px-3 py-2 cursor-pointer hover:border-border transition">
                      <Checkbox
                        checked={selectedComms.includes(c.id)}
                        onCheckedChange={() => setSelectedComms((prev) =>
                          prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]
                        )}
                      />
                      <span className="text-sm text-foreground">{c.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {resp.communities.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Nessuna community assegnata</span>
                  ) : resp.communities.map((c) => (
                    <span key={c.id} className="rounded-full bg-muted border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {c.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
