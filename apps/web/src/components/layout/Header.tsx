'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const router = useRouter();
  const isCurrent = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname?.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-[#FFFFFF] border-b border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="h-16 max-w-7xl mx-auto px-4 flex items-center justify-between gap-space-md">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-space-md shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary-container text-white flex items-center justify-center font-bold text-lg shadow-sm">
            P
          </div>
          <span className="font-headline-sm text-headline-sm text-primary tracking-tight">
            Promexa
          </span>
        </Link>

        {/* Global Search */}
        <div className="flex-1 max-w-lg hidden md:block">
          <div className="relative flex items-center w-full">
            <span className="material-symbols-outlined absolute left-3 text-outline pointer-events-none text-[20px]">
              search
            </span>
            <input
              className="w-full h-[42px] pl-10 pr-4 bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:border-primary-container focus:outline-none transition-colors"
              placeholder="Buscar en Promexa (personas, negocios, productos)..."
              type="text"
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-space-xs">
          <Link
            href="/"
            className={`px-3 py-2 rounded-lg font-body-md text-body-md transition-colors flex items-center gap-1.5 ${
              isCurrent('/')
                ? 'bg-primary-container text-on-primary font-body-md-medium'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            Inicio
          </Link>

          <Link
            href="/marketplace"
            className={`px-3 py-2 rounded-lg font-body-md text-body-md transition-colors flex items-center gap-1.5 ${
              isCurrent('/marketplace')
                ? 'bg-primary-container text-on-primary font-body-md-medium'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            Marketplace
          </Link>

          <Link
            href="/mensajes"
            className={`relative px-3 py-2 rounded-lg font-body-md text-body-md transition-colors flex items-center gap-1.5 ${
              isCurrent('/mensajes')
                ? 'bg-primary-container text-on-primary font-body-md-medium'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <span>Mensajes</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
          </Link>

          <button
            type="button"
            className="relative px-3 py-2 rounded-lg font-body-md text-body-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors flex items-center gap-1.5"
          >
            <span>Notificaciones</span>
            <span className="px-1.5 py-0.2 bg-[#DC2626] text-on-error font-label-sm text-label-sm rounded-full text-[11px] leading-tight">
              3
            </span>
          </button>
        </nav>

        {/* Right User Profile */}
        <div className="flex items-center gap-space-sm shrink-0">

          {user ? (
            <div className="relative">
              <button
                className="flex items-center gap-2 pl-1 cursor-pointer group focus:outline-none"
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-primary flex items-center justify-center text-white ring-1 ring-primary/20">
                  {user.avatar ? (
                    <img alt={user.name} className="w-full h-full object-cover" src={user.avatar} />
                  ) : (
                    <span className="material-symbols-outlined text-on-primary text-[18px]">
                      person
                    </span>
                  )}
                </div>
                <div className="hidden xl:flex flex-col text-left">
                  <div className="flex items-center gap-1">
                    <span className="font-body-md-medium text-body-md-medium text-on-surface">
                      {user.name}
                    </span>
                    {user.isVerified && (
                      <span
                        className="material-symbols-outlined text-primary-container text-[16px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                        title="Verificado"
                      >
                        verified
                      </span>
                    )}
                  </div>
                </div>
                <span className="material-symbols-outlined text-outline text-[20px] group-hover:text-on-surface transition-colors">
                  arrow_drop_down
                </span>
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div
                  className="absolute right-0 top-12 w-56 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 py-2 z-50 animate-fadeIn"
                  onMouseLeave={() => setShowProfileMenu(false)}
                >
                  <div className="px-4 py-2 border-b border-surface-container">
                    <p className="font-body-md-medium text-body-md-medium text-on-surface truncate">
                      {user.name}
                    </p>
                    <p className="font-caption text-caption text-outline truncate">{user.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-surface-container font-caption text-caption text-primary">
                      {user.profileType === 'business' ? 'Negocio Local' : 'Usuario Personal'}
                    </span>
                  </div>

                  <Link
                    href="/"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-on-surface hover:bg-surface-container font-body-md text-body-md transition-colors"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <span className="material-symbols-outlined text-[18px] text-outline">
                      person
                    </span>
                    <span>Mi Perfil</span>
                  </Link>

                  <Link
                    href="/marketplace"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-on-surface hover:bg-surface-container font-body-md text-body-md transition-colors"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <span className="material-symbols-outlined text-[18px] text-outline">
                      storefront
                    </span>
                    <span>Mis Productos</span>
                  </Link>

                  <div className="h-px bg-surface-container my-1" />

                  <button
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-rose-600 hover:bg-rose-50 font-body-md text-body-md transition-colors"
                    type="button"
                    onClick={() => {
                      logout();
                      setShowProfileMenu(false);
                      router.replace('/login');
                    }}
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg bg-surface-container text-primary font-body-md-medium text-body-md-medium hover:bg-surface-container-high transition-colors"
            >
              Iniciar Sesión
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
