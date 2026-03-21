'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import RichTextEditor from '@/components/ui/RichTextEditor';

interface Community {
  id: string;
  name: string;
  banner_active: boolean;
  banner_content: string | null;
  banner_link_url: string | null;
  banner_link_label: string | null;
}

interface BannerState {
  active: boolean;
  content: string;
  linkUrl: string;
  linkLabel: string;
  saving: boolean;
}

function useBannerState(community: Community): [BannerState, React.Dispatch<React.SetStateAction<BannerState>>] {
  return useState<BannerState>({
    active: community.banner_active,
    content: community.banner_content ?? '',
    linkUrl: community.banner_link_url ?? '',
    linkLabel: community.banner_link_label ?? '',
    saving: false,
  });
}

function CommunityBannerCard({ community }: { community: Community }) {
  const [state, setState] = useBannerState(community);

  const isContentEmpty = !state.content.replace(/<[^>]*>/g, '').trim();
  const isUrlInvalid = !!state.linkUrl && !state.linkUrl.startsWith('http') && !state.linkUrl.startsWith('/');
  const canSave = !state.saving && !(state.active && isContentEmpty) && !isUrlInvalid;

  async function handleSave() {
    if (state.active && isContentEmpty) {
      toast.error('Inserisci un contenuto prima di attivare il banner');
      return;
    }
    if (isUrlInvalid) {
      toast.error('URL non valido — usa https://... o un percorso relativo /...');
      return;
    }
    setState((s) => ({ ...s, saving: true }));
    try {
      const res = await fetch(`/api/admin/banner/${community.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          banner_content: state.content,
          banner_active: state.active,
          banner_link_url: state.linkUrl || undefined,
          banner_link_label: state.linkLabel || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Banner salvato');
    } catch {
      toast.error('Errore nel salvataggio del banner');
    } finally {
      setState((s) => ({ ...s, saving: false }));
    }
  }

  return (
    <Card>
      <CardHeader className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">{community.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {state.active ? 'Banner attivo — visibile ai collaboratori' : 'Banner inattivo — non visibile'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Attivo</span>
            <Switch
              checked={state.active}
              onCheckedChange={(v) => setState((s) => ({ ...s, active: v }))}
              aria-label={`Attiva banner ${community.name}`}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 py-4 space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Contenuto</p>
          <RichTextEditor
            value={state.content}
            onChange={(html) => setState((s) => ({ ...s, content: html }))}
            placeholder="Scrivi il testo del banner..."
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Link CTA (opzionale)</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Input
                placeholder="URL (es. https://... o /percorso)"
                value={state.linkUrl}
                onChange={(e) => setState((s) => ({ ...s, linkUrl: e.target.value }))}
                className={isUrlInvalid ? 'border-destructive' : ''}
              />
              {isUrlInvalid && (
                <p className="text-xs text-destructive mt-1">URL non valido — usa https://... o /percorso</p>
              )}
            </div>
            <Input
              placeholder="Etichetta link (es. Scopri di più)"
              value={state.linkLabel}
              onChange={(e) => setState((s) => ({ ...s, linkLabel: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            className="bg-brand hover:bg-brand/90 text-white"
            onClick={handleSave}
            disabled={!canSave}
          >
            {state.saving ? 'Salvataggio…' : 'Salva'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BannerManager({ communities }: { communities: Community[] }) {
  if (communities.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessuna community attiva.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configura il banner informativo per ciascuna community. Il banner viene mostrato ai collaboratori nella parte superiore dell&apos;app.
      </p>
      {communities.map((c) => (
        <CommunityBannerCard key={c.id} community={c} />
      ))}
    </div>
  );
}
