import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-[#FFFFFF] border-t border-[#E5E7EB] py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-headline-sm text-headline-sm text-primary">Promexa</span>
          <span className="font-caption text-caption text-outline">
            Plataforma Comunitaria & Marketplace Comercial
          </span>
        </div>
        <div className="flex items-center gap-space-md">
          <Link
            className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
            href="#"
          >
            Términos de Servicio
          </Link>
          <Link
            className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
            href="#"
          >
            Políticas de Privacidad
          </Link>
          <Link
            className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
            href="#"
          >
            Centro de Ayuda
          </Link>
        </div>
        <span className="font-label-sm text-label-sm text-outline">
          © 2026 Promexa Inc. Todos los derechos reservados.
        </span>
      </div>
    </footer>
  );
}
