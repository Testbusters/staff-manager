'use client';

import { useState } from 'react';
import { Upload, FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AllegatoGlobale } from '@/lib/types';

interface Community {
  id: string;
  name: string;
}

interface Props {
  communities: Community[];
  initialAllegati: AllegatoGlobale[];
}

type AllegatoTipo = 'docenza' | 'cocoda';

const TIPO_LABELS: Record<AllegatoTipo, string> = {
  docenza: 'Docenza',
  cocoda: 'CoCoDà',
};

export default function AllegatiCorsiManager({ communities, initialAllegati }: Props) {
  const [allegati, setAllegati] = useState<AllegatoGlobale[]>(initialAllegati);
  const [uploading, setUploading] = useState<string | null>(null); // `${community_id}:${tipo}`
  const [errors, setErrors] = useState<Record<string, string>>({});

  function getAllegato(community_id: string, tipo: AllegatoTipo): AllegatoGlobale | undefined {
    return allegati.find((a) => a.community_id === community_id && a.tipo === tipo);
  }

  async function handleUpload(community_id: string, tipo: AllegatoTipo, file: File) {
    const key = `${community_id}:${tipo}`;
    setUploading(key);
    setErrors((prev) => ({ ...prev, [key]: '' }));

    const formData = new FormData();
    formData.append('tipo', tipo);
    formData.append('community_id', community_id);
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/allegati-corsi', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) {
        setErrors((prev) => ({
          ...prev,
          [key]: typeof json.error === 'string' ? json.error : 'Errore durante il caricamento',
        }));
        return;
      }
      setAllegati((prev) => {
        const filtered = prev.filter((a) => !(a.community_id === community_id && a.tipo === tipo));
        return [...filtered, json.allegato];
      });
    } catch {
      setErrors((prev) => ({ ...prev, [key]: 'Errore di rete' }));
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="space-y-6">
      {communities.map((community) => (
        <div key={community.id} className="rounded-2xl bg-card border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">{community.name}</h2>
          </div>
          <div className="p-5 space-y-4">
            {(['docenza', 'cocoda'] as AllegatoTipo[]).map((tipo) => {
              const allegato = getAllegato(community.id, tipo);
              const key = `${community.id}:${tipo}`;
              const isUploading = uploading === key;
              const err = errors[key];

              return (
                <div key={tipo} className="flex items-center justify-between gap-4 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{TIPO_LABELS[tipo]}</p>
                      {allegato ? (
                        <a
                          href={allegato.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-link hover:text-link/80 flex items-center gap-1 truncate"
                        >
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          {allegato.nome_file}
                        </a>
                      ) : (
                        <p className="text-xs text-muted-foreground">Nessun file caricato</p>
                      )}
                      {allegato && (
                        <p className="text-xs text-muted-foreground">
                          Aggiornato: {new Date(allegato.updated_at).toLocaleDateString('it-IT')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="sr-only"
                        accept=".pdf,.doc,.docx"
                        disabled={isUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(community.id, tipo, file);
                          e.target.value = '';
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isUploading}
                        asChild
                      >
                        <span>
                          <Upload className="h-3.5 w-3.5 mr-1.5" />
                          {isUploading ? 'Caricamento…' : allegato ? 'Sostituisci' : 'Carica'}
                        </span>
                      </Button>
                    </label>
                    {err && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{err}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {communities.length === 0 && (
        <p className="text-sm text-muted-foreground">Nessuna community attiva trovata.</p>
      )}
    </div>
  );
}
