'use client';
import React, { useEffect, useRef, useState } from 'react';
import { squareCrop } from '@/lib/avatar-crop';
export default function AvatarCropper({ file, onApply, onCancel }: {
  file: File; onApply: (file: File) => void; onCancel: () => void;
}) {
  const [src, setSrc] = useState('');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(256);
  const drag = useRef<{ x: number; y: number; position: { x: number; y: number } } | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file); setSrc(url);
    setDimensions({ width: 0, height: 0 }); setZoom(1); setPosition({ x: 0, y: 0 }); setError('');
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setSize(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const crop = squareCrop(dimensions.width, dimensions.height, zoom, position.x, position.y);
  const scale = crop.side ? size / crop.side : 1;
  const clamp = (value: number) => Math.max(-1, Math.min(1, value));
  const apply = async () => {
    if (!image.current || !crop.side || busy) return;
    setBusy(true); setError('');
    try {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
      const context = canvas.getContext('2d');
      if (!context) throw new Error();
      context.drawImage(image.current, crop.x, crop.y, crop.side, crop.side, 0, 0, 512, 512);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error()), 'image/webp', 0.9));
      onApply(new File([blob], blob.type === 'image/webp' ? 'avatar.webp' : 'avatar.png', { type: blob.type }));
    } catch { setError('No se pudo recortar la imagen. Selecciona otra foto.'); }
    finally { setBusy(false); }
  };
  return <div className="space-y-4">
    <h3 className="font-semibold">Encuadrar foto de perfil</h3>
    <p className="text-sm text-gray-600">Arrastra la foto y ajusta el zoom. El circulo muestra como se vera tu foto de perfil.</p>
    <div ref={viewport} className="relative mx-auto w-full max-w-sm aspect-square overflow-hidden bg-gray-200 touch-none select-none cursor-move"
      onPointerDown={event => {
        if (busy || !dimensions.width) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { x: event.clientX, y: event.clientY, position: { ...position } };
      }}
      onPointerMove={event => {
        if (!drag.current) return;
        const overflowX = (dimensions.width - crop.side) * scale;
        const overflowY = (dimensions.height - crop.side) * scale;
        setPosition({ x: overflowX > 0 ? clamp(drag.current.position.x - 2 * (event.clientX - drag.current.x) / overflowX) : 0,
          y: overflowY > 0 ? clamp(drag.current.position.y - 2 * (event.clientY - drag.current.y) / overflowY) : 0 });
      }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      {src && <img ref={image} src={src} alt="Foto seleccionada para recortar" draggable={false}
        onLoad={event => setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
        onError={() => setError('No se pudo abrir esta imagen.')}
        style={{ position: 'absolute', maxWidth: 'none', width: dimensions.width ? dimensions.width * scale : '100%',
          height: dimensions.height ? dimensions.height * scale : 'auto', left: -crop.x * scale, top: -crop.y * scale }} />}
      <div aria-hidden="true" className="absolute inset-0 rounded-full border-2 border-white pointer-events-none" style={{ boxShadow: '0 0 0 999px rgba(0,0,0,0.55)' }} />
    </div>
    <fieldset disabled={busy || !dimensions.width} className="space-y-2">
      <label className="block text-sm">Zoom<input aria-label="Zoom de la foto" className="block w-full" type="range" min="1" max="3" step="0.01" value={zoom} onChange={event => setZoom(Number(event.target.value))} /></label>
      <label className="block text-sm">Posicion horizontal<input aria-label="Posicion horizontal" className="block w-full" type="range" min="-1" max="1" step="0.01" value={position.x} onChange={event => setPosition(previous => ({ ...previous, x: Number(event.target.value) }))} /></label>
      <label className="block text-sm">Posicion vertical<input aria-label="Posicion vertical" className="block w-full" type="range" min="-1" max="1" step="0.01" value={position.y} onChange={event => setPosition(previous => ({ ...previous, y: Number(event.target.value) }))} /></label>
    </fieldset>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex justify-end gap-3">
      <button type="button" disabled={busy} onClick={onCancel} className="px-4 py-2 border rounded-lg">Cancelar recorte</button>
      <button type="button" disabled={busy || !dimensions.width || !!error} onClick={apply} className="px-4 py-2 bg-primary-container text-white rounded-lg disabled:opacity-50">{busy ? 'Recortando...' : 'Usar esta foto'}</button>
    </div>
  </div>;
}
