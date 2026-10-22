'use client';
import React from 'react';
const placeholder = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#e5e7eb"/><circle cx="32" cy="24" r="11" fill="#6b7280"/><path d="M12 57c0-13 9-20 20-20s20 7 20 20" fill="#6b7280"/></svg>')}`;
export default function UserAvatar({ src, alt, onError, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  return <img {...props} src={src || placeholder} alt={alt || 'Foto de perfil'} onError={event => {
    event.currentTarget.onerror = null;
    if (event.currentTarget.getAttribute('src') !== placeholder) event.currentTarget.src = placeholder;
    onError?.(event);
  }} />;
}
