'use client';

import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';

export interface SignatureCanvasHandle {
  getSignaturePng: () => Promise<Blob | null>;
  clear: () => void;
  isEmpty: () => boolean;
}

interface Props {
  onChange?: (empty: boolean) => void;
}

const SignatureCanvas = forwardRef<SignatureCanvasHandle, Props>(
  function SignatureCanvas({ onChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const [empty, setEmpty] = useState(true);

    // Resize canvas to match container
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width || 400;
      canvas.height = rect.height || 160;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, []);

    function getPos(e: React.MouseEvent | React.TouchEvent) {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      if ('touches' in e) {
        const t = e.touches[0];
        return { x: t.clientX - rect.left, y: t.clientY - rect.top };
      }
      return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
    }

    function startDraw(e: React.MouseEvent | React.TouchEvent) {
      e.preventDefault();
      drawing.current = true;
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    function draw(e: React.MouseEvent | React.TouchEvent) {
      e.preventDefault();
      if (!drawing.current) return;
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      const { x, y } = getPos(e);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#111827';
      ctx.lineTo(x, y);
      ctx.stroke();
      if (empty) {
        setEmpty(false);
        onChange?.(false);
      }
    }

    function stopDraw(e: React.MouseEvent | React.TouchEvent) {
      e.preventDefault();
      drawing.current = false;
    }

    function handleClear() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setEmpty(true);
      onChange?.(true);
    }

    useImperativeHandle(ref, () => ({
      getSignaturePng: async () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        return new Promise((resolve) => {
          canvas.toBlob((blob) => resolve(blob), 'image/png');
        });
      },
      clear: handleClear,
      isEmpty: () => empty,
    }));

    return (
      <div className="space-y-2">
        <canvas
          ref={canvasRef}
          className="w-full h-40 rounded-lg border border-border bg-white cursor-crosshair touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={empty}
        >
          Cancella
        </Button>
      </div>
    );
  },
);

export default SignatureCanvas;
