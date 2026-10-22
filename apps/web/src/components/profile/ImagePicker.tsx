'use client';
import React, { useEffect, useState, useId } from 'react';
import UserAvatar from './UserAvatar';
export default function ImagePicker({ file, src, onChange, onRemove, maxMB, disabled, label }: {
  file: File | null; src?: string; onChange: (file: File) => void; onRemove: () => void;
  maxMB: number; disabled?: boolean; label: string;
}) {
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const id = useId();
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return <div className="space-y-2">
    {(preview || src) && <UserAvatar src={preview || src} alt="Vista previa de la imagen seleccionada" className={`${maxMB === 5 ? 'w-full max-w-sm aspect-square rounded-full object-cover mx-auto' : 'max-h-40 max-w-full rounded-lg object-contain'}`} />}
    <label htmlFor={id} className="block text-sm font-medium">{label}</label>
    <input id={id} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled}
      aria-describedby={`${id}-hint`} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 file:bg-surface-container file:text-primary"
      onChange={event => {
        const selected = event.target.files?.[0]; event.target.value = '';
        if (!selected) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) { setError('Usa una imagen JPG, PNG o WebP'); return; }
        if (selected.size > maxMB * 1024 * 1024) { setError(`El limite es ${maxMB} MB`); return; }
        setError(''); onChange(selected);
      }} />
    <p id={`${id}-hint`} className="text-xs text-gray-500">JPG, PNG o WebP. Maximo {maxMB} MB.</p>
    {(file || src) && <button type="button" disabled={disabled} onClick={() => { onRemove(); setError(''); }} className="text-sm text-red-700 hover:underline">Quitar imagen</button>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
