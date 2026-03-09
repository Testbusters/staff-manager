'use client';

import { useRef, useState } from 'react';
import SignatureCanvas, { type SignatureCanvasHandle } from './SignatureCanvas';

interface Props {
  onSignatureReady: (blob: Blob) => void;
  onClear: () => void;
}

export default function SignaturePad({ onSignatureReady, onClear }: Props) {
  const [tab, setTab] = useState<'draw' | 'upload'>('draw');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const canvasRef = useRef<SignatureCanvasHandle>(null);
  const [canvasEmpty, setCanvasEmpty] = useState(true);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    onSignatureReady(file);
  }

  function handleCanvasChange(empty: boolean) {
    setCanvasEmpty(empty);
    if (empty) {
      onClear();
    }
  }

  async function handleCanvasCommit() {
    const blob = await canvasRef.current?.getSignaturePng();
    if (blob) onSignatureReady(blob);
  }

  function handleTabSwitch(t: 'draw' | 'upload') {
    setTab(t);
    onClear();
    setImagePreview(null);
    setImageFile(null);
    canvasRef.current?.clear();
  }

  const tabCls = (t: 'draw' | 'upload') =>
    `flex-1 py-2 text-xs font-medium rounded-md transition ${
      tab === t
        ? 'bg-card text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground'
    }`;

  return (
    <div className="space-y-3">
      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button type="button" onClick={() => handleTabSwitch('draw')} className={tabCls('draw')}>
          Disegna firma
        </button>
        <button type="button" onClick={() => handleTabSwitch('upload')} className={tabCls('upload')}>
          Carica immagine
        </button>
      </div>

      {tab === 'draw' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Traccia la tua firma nell&apos;area bianca con mouse o dito.
          </p>
          <SignatureCanvas ref={canvasRef} onChange={handleCanvasChange} />
          {!canvasEmpty && (
            <button
              type="button"
              onClick={handleCanvasCommit}
              className="text-xs text-link hover:text-link/80 underline"
            >
              Conferma firma disegnata
            </button>
          )}
        </div>
      )}

      {tab === 'upload' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Carica un&apos;immagine della tua firma (PNG, JPG, JPEG).
          </p>
          <label className="flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed border-border bg-muted/40 cursor-pointer hover:bg-muted/60 transition">
            <span className="text-xs text-muted-foreground">
              {imageFile ? imageFile.name : 'Clicca per scegliere un\'immagine'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </label>
          {imagePreview && (
            <div className="rounded-lg border border-border bg-white p-2 flex items-center justify-center h-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Anteprima firma" className="max-h-20 object-contain" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
