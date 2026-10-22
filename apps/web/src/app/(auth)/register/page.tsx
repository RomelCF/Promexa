'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    profileType: 'personal' as 'personal' | 'business',
  });

  const [authStatus, setAuthStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setAuthStatus('loading');

    const result = await register(formData.name, formData.email, formData.password, formData.profileType);
    if (!result.success) {
      setAuthStatus('idle');
      setErrorMessage(result.error || 'No se pudo crear la cuenta');
      return;
    }

    setAuthStatus('success');
    setTimeout(() => {
      router.push('/');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#08427B] via-primary to-primary-container flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center p-2 border border-white/20">
              <svg className="w-full h-full" fill="none" viewBox="0 0 48 48">
                <rect fill="#FFFFFF" fillOpacity="0.15" height="48" rx="12" width="48" />
                <path
                  d="M14 36V14H24.5C28.6421 14 32 17.3579 32 21.5C32 25.6421 28.6421 29 24.5 29H20V36H14ZM20 23.5H24.5C25.6046 23.5 26.5 22.6046 26.5 21.5C26.5 20.3954 25.6046 19.5 24.5 19.5H20V23.5Z"
                  fill="#FFFFFF"
                />
                <circle cx="34" cy="34" fill="#F28C28" r="5" />
              </svg>
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-white">Promexa</h1>
              <p className="text-sm text-white/80">Registro de Usuarios</p>
            </div>
          </Link>
          <h2 className="text-3xl font-bold text-white mb-2">Crear Cuenta</h2>
          <p className="text-white/80">Únete a la comunidad de comercios locales</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-red-600">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Profile Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Perfil
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formData.profileType === 'personal'
                      ? 'border-[#08427B] bg-[#08427B]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setFormData({ ...formData, profileType: 'personal' })}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="material-symbols-outlined text-2xl text-[#08427B]">person</span>
                    <span className="text-sm font-medium">Personal</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formData.profileType === 'business'
                      ? 'border-[#08427B] bg-[#08427B]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setFormData({ ...formData, profileType: 'business' })}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="material-symbols-outlined text-2xl text-[#08427B]">store</span>
                    <span className="text-sm font-medium">Negocio</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                {formData.profileType === 'business' ? 'Nombre del Negocio' : 'Nombre Completo'}
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  badge
                </span>
                <input
                  id="name"
                  type="text"
                  required
                  placeholder={formData.profileType === 'business' ? 'Ej. Mi Tienda S.A.C.' : 'Ej. Juan Pérez'}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08427B] focus:border-transparent"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  mail
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="ejemplo@correo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08427B] focus:border-transparent"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  lock
                </span>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#08427B] focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">La contraseña debe tener al menos 8 caracteres</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={authStatus === 'loading'}
              className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
                authStatus === 'success'
                  ? 'bg-green-600'
                  : 'bg-[#08427B] hover:bg-[#063366]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {authStatus === 'loading' && (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin">sync</span>
                  Creando cuenta...
                </span>
              )}
              {authStatus === 'success' && (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">check_circle</span>
                  ¡Cuenta creada!
                </span>
              )}
              {authStatus === 'idle' && 'Registrarme'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-[#08427B] font-semibold hover:underline">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-white/60 text-sm">
          <p>Al registrarte aceptas los términos y condiciones de Promexa</p>
        </div>
      </div>
    </div>
  );
}
