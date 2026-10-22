import React from 'react';
export function presenceLabel(online: boolean | null | undefined) {
  return online === true ? 'En linea' : online === false ? 'Desconectado' : 'Estado no disponible';
}
export default function PresenceDot({ online, className = '' }: { online?: boolean | null; className?: string }) {
  return <span role="img" aria-label={presenceLabel(online)} title={presenceLabel(online)}
    className={`inline-block rounded-full ${online === true ? 'bg-emerald-500' : 'bg-gray-400'} ${className}`} />;
}
