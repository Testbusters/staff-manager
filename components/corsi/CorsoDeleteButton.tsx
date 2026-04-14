'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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

interface Props {
  corsoId: string;
  corsoNome: string;
}

export default function CorsoDeleteButton({ corsoId, corsoNome }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/corsi/${corsoId}`, { method: 'DELETE' });
      if (res.status === 204) {
        toast.success('Corso eliminato con successo.');
        router.push('/corsi');
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? 'Errore durante l\'eliminazione del corso.');
      }
    } catch {
      toast.error('Errore di rete. Riprova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={loading}>
          <Trash2 className="h-4 w-4 mr-1.5" />
          Elimina corso
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminare il corso?</AlertDialogTitle>
          <AlertDialogDescription>
            Stai per eliminare il corso <strong>{corsoNome}</strong>. L&apos;operazione è irreversibile e
            rimuoverà anche tutte le lezioni associate. Non è possibile eliminare un corso con candidature
            attive o docenti assegnati.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Elimina
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
