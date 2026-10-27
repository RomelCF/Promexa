'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChatProvider } from '@/lib/use-chat-socket';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/lib/auth-context';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  // Avoid hydration mismatch: server renders with user=null, so we wait
  // until mounted on the client before rendering auth-dependent content.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      router.replace('/login');
    }
  }, [mounted, user, isLoading, router]);

  // Pantalla de carga hasta que el cliente esté listo o mientras se valida la sesión
  if (!mounted || isLoading) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[#F5F7FA]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary-container text-white flex items-center justify-center font-bold text-xl shadow-md animate-pulse">
            P
          </div>
          <div className="flex items-center gap-2 text-primary font-medium text-body-md">
            <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
            <span>Verificando sesión...</span>
          </div>
        </div>
      </div>
    );
  }

  // Si no está autenticado, no renderiza nada mientras redirige a /login
  if (!user) {
    return null;
  }

  return (
    <ChatProvider>
      <Header />
      <main className="w-full pt-16 flex-1">
        {children}
      </main>
      <Footer />
    </ChatProvider>
  );
}
