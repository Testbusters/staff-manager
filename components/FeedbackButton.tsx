'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquare, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const CATEGORIE = ['Bug', 'Suggerimento', 'Domanda', 'Altro'] as const;
type Categoria = typeof CATEGORIE[number];

export default function FeedbackButton() {
  const pathname = usePathname();

  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [categoria, setCategoria] = useState<Categoria>('Bug');
  const [pagina, setPagina]     = useState(pathname);
  const [messaggio, setMessaggio] = useState('');
  const [file, setFile]         = useState<File | null>(null);

  const openModal = () => {
    setPagina(pathname);
    setSuccess(false);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setCategoria('Bug');
    setMessaggio('');
    setFile(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData();
    fd.append('categoria', categoria);
    fd.append('pagina', pagina);
    fd.append('messaggio', messaggio);
    if (file) fd.append('screenshot', file);

    const res = await fetch('/api/feedback', { method: 'POST', body: fd });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? 'Errore durante l\'invio.', { duration: 5000 });
      return;
    }

    setSuccess(true);
    setTimeout(() => closeModal(), 2000);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={openModal}
        aria-label="Invia feedback"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-brand hover:bg-brand/90 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition"
      >
        <MessageSquare className="h-4 w-4" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) closeModal(); else setOpen(true); }}>
        <DialogContent className="max-w-md bg-card border-border">
          {success ? (
            <div className="py-8 text-center space-y-3">
              <div className="flex justify-center"><CheckCircle2 className="h-12 w-12 text-green-500" /></div>
              <p className="font-medium text-foreground">Grazie per il feedback!</p>
              <p className="text-sm text-muted-foreground">Il messaggio è stato inviato.</p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-semibold text-foreground">Invia feedback</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Categoria */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Categoria</label>
                  <Select value={categoria} onValueChange={(v) => setCategoria(v as Categoria)} disabled={loading}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIE.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pagina */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Pagina</label>
                  <Input
                    type="text"
                    value={pagina}
                    onChange={(e) => setPagina(e.target.value)}
                    disabled={loading}
                    placeholder="/compensi"
                  />
                </div>

                {/* Messaggio */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">
                    Messaggio <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    value={messaggio}
                    onChange={(e) => setMessaggio(e.target.value)}
                    disabled={loading}
                    rows={4}
                    required
                    placeholder="Descrivi il problema o il suggerimento…"
                  />
                </div>

                {/* Screenshot */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">
                    Screenshot <span className="text-muted-foreground">(opzionale, max 5 MB)</span>
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={loading}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:text-foreground file:cursor-pointer hover:file:bg-muted transition"
                  />
                  {file && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {file.name} ({(file.size / 1024).toFixed(0)} KB)
                    </p>
                  )}
                </div>

                <div className="flex gap-3 justify-end pt-1">
                  <Button type="button" variant="outline" onClick={closeModal} disabled={loading}>
                    Annulla
                  </Button>
                  <Button type="submit" disabled={loading || !messaggio.trim()} className="bg-brand hover:bg-brand/90 text-white">
                    {loading ? 'Invio…' : 'Invia'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
