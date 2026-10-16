import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'Promexa - Red Social & Marketplace Local',
  description:
    'Plataforma comunitaria y marketplace que conecta a personas y comercios locales sin intermediarios, con mensajería instantánea y recomendaciones inteligentes.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-[#F5F7FA] font-body-md text-on-surface antialiased min-h-screen flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
