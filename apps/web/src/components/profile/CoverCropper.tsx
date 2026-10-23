'use client';

import React, { useEffect, useRef, useState } from 'react';

export default function CoverCropper({ file, onApply, onCancel, modal = false }: {
  file: File; onApply: (file: File) => void | Promise<void>; onCancel: () => void; modal?: boolean;
}) {
  const [src, setSrc] = useState('');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [position, setPosition] = useState(0.5);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const image = useRef<HTMLImageElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const drag = useRef<{ y: number; position: number; overflow: number } | null>(null);
  const ratio = 4.5;
  const cropWidth = Math.min(dimensions.width, dimensions.height * ratio) / zoom;
  const cropHeight = cropWidth / ratio;
  const cropX = (dimensions.width - cropWidth) / 2;
  const cropY = (dimensions.height - cropHeight) * position;

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url); setDimensions({ width: 0, height: 0 }); setPosition(0.5); setZoom(1); setError('');
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => { if (modal) dialog.current?.showModal(); }, [modal]);

  const apply = async () => {
    if (!image.current || !cropWidth || busy) return;
    setBusy(true); setError('');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1800; canvas.height = 400;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No se pudo preparar la imagen.');
      context.drawImage(image.current, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
        value => value ? resolve(value) : reject(new Error('No se pudo encuadrar la portada.')), 'image/webp', 0.92,
      ));
      await onApply(new File([blob], blob.type === 'image/webp' ? 'portada.webp' : 'portada.png', { type: blob.type }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la portada. Intenta de nuevo.');
    } finally { setBusy(false); }
  };

  const content = <div className="space-y-4">
    <h3 className="font-semibold">Encuadrar foto de portada</h3>
    <p className="text-sm text-gray-600">Arrastra la foto hacia arriba o abajo para elegir qué parte mostrar.</p>
    <div className="relative w-full aspect-[4.5/1] overflow-hidden rounded-xl bg-gray-200 touch-none select-none cursor-ns-resize"
      onPointerDown={event => {
        if (busy || !cropWidth) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { y: event.clientY, position, overflow: (dimensions.height - cropHeight) * event.currentTarget.clientWidth / cropWidth };
      }}
      onPointerMove={event => {
        if (!drag.current || busy || drag.current.overflow <= 0) return;
        setPosition(Math.max(0, Math.min(1, drag.current.position - (event.clientY - drag.current.y) / drag.current.overflow)));
      }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
      onLostPointerCapture={() => { drag.current = null; }}>
      {src && <img ref={image} src={src} alt="Vista previa del encuadre de portada" draggable={false}
        onLoad={event => setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
        onError={() => setError('No se pudo abrir esta imagen. Selecciona otra foto.')}
        className="absolute max-w-none pointer-events-none"
        style={{ width: cropWidth ? `${dimensions.width / cropWidth * 100}%` : '100%',
          height: cropHeight ? `${dimensions.height / cropHeight * 100}%` : 'auto',
          left: cropWidth ? `${-cropX / cropWidth * 100}%` : 0, top: cropHeight ? `${-cropY / cropHeight * 100}%` : 0 }} />}
    </div>
    <fieldset disabled={busy || !cropWidth} className="space-y-3">
      <label className="block text-sm">Posición vertical
        <input className="block w-full" type="range" min="0" max="1" step="0.001" value={position} onChange={event => setPosition(Number(event.target.value))} />
      </label>
      <label className="block text-sm">Zoom
        <input className="block w-full" type="range" min="1" max="3" step="0.01" value={zoom} onChange={event => setZoom(Number(event.target.value))} />
      </label>
    </fieldset>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex justify-end gap-3">
      <button type="button" disabled={busy} onClick={onCancel} autoFocus={modal} className="px-4 py-2 border rounded-lg disabled:opacity-50">Cancelar</button>
      <button type="button" disabled={busy || !cropWidth} onClick={apply} className="px-4 py-2 bg-primary-container text-white rounded-lg disabled:opacity-50">{busy ? 'Guardando...' : 'Usar este encuadre'}</button>
    </div>
  </div>;

  return modal ? <dialog ref={dialog} aria-label="Encuadrar foto de portada"
    onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}
    className="w-[calc(100%_-_2rem)] max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 backdrop:bg-black/60">{content}</dialog> : content;
}
