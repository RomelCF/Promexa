'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, login, register } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(user.role === 'ADMIN' ? '/admin' : '/');
    }
  }, [user, isLoading, router]);

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [profileType, setProfileType] = useState<'personal' | 'business'>('personal');
  const [showPassword, setShowPassword] = useState(false);
  const [authStatus, setAuthStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setAuthStatus('loading');

    const result = await login(email, password);
    if (!result.success) {
      setAuthStatus('idle');
      setErrorMessage(result.error || 'Credenciales inválidas');
      return;
    }

    setAuthStatus('success');
    const targetPath = result.user?.role === 'ADMIN' ? '/admin' : '/';
    setTimeout(() => {
      router.push(targetPath);
    }, 600);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setAuthStatus('loading');

    const result = await register(name, email, password, profileType);
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
    <div className="w-full min-h-screen flex flex-col lg:flex-row">
      {/* Left Hero Column */}
      <div className="w-full lg:w-5/12 xl:w-[46%] bg-gradient-to-br from-[#08427B] via-primary to-primary-container p-8 sm:p-12 lg:p-16 text-on-primary flex flex-col justify-between relative overflow-hidden shrink-0">
        {/* Glows */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 -right-20 w-96 h-96 rounded-full bg-tertiary-fixed/15 blur-3xl pointer-events-none" />

        {/* Top Header / Brand Mark */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-on-primary/10 backdrop-blur-md flex items-center justify-center p-2 shadow-sm border border-white/10">
              <svg className="w-full h-full" fill="none" viewBox="0 0 48 48">
                <rect fill="#FFFFFF" fillOpacity="0.15" height="48" rx="12" width="48" />
                <path
                  d="M14 36V14H24.5C28.6421 14 32 17.3579 32 21.5C32 25.6421 28.6421 29 24.5 29H20V36H14ZM20 23.5H24.5C25.6046 23.5 26.5 22.6046 26.5 21.5C26.5 20.3954 25.6046 19.5 24.5 19.5H20V23.5Z"
                  fill="#FFFFFF"
                />
                <circle cx="34" cy="34" fill="#F28C28" r="5" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-lg text-headline-lg tracking-tight font-bold text-on-primary">
                Promexa
              </span>
              <span className="font-caption text-caption text-on-primary-container tracking-wider uppercase font-semibold">
                Red & Marketplace Local
              </span>
            </div>
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-on-primary/15 backdrop-blur-sm text-on-primary font-label-sm text-label-sm border border-white/10">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            Red activa
          </span>
        </div>

        {/* Center Narrative */}
        <div className="relative z-10 my-10 lg:my-14 space-y-6 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-lowest/15 backdrop-blur-md border border-white/10">
            <span className="material-symbols-outlined text-tertiary-fixed text-[18px]">
              verified
            </span>
            <span className="font-label-sm text-label-sm text-surface-container-low font-medium">
              Plataforma Oficial de Comercio Regional
            </span>
          </div>
          <h1 className="font-headline-xl text-3xl lg:text-4xl text-on-primary leading-tight font-bold tracking-tight">
            La plataforma que conecta a personas y comercios locales sin intermediarios.
          </h1>
          <p className="font-body-lg text-body-lg text-on-primary-container leading-relaxed">
            Descubre productos únicos, apoya a emprendedores de tu comunidad y comunícate directamente por chat en tiempo real.
          </p>

          {/* Feature Value List */}
          <div className="space-y-4 pt-3">
            <div className="flex items-start gap-3.5 group">
              <div className="w-10 h-10 rounded-lg bg-on-primary/15 backdrop-blur-sm flex items-center justify-center shrink-0 group-hover:bg-on-primary/25 transition-colors border border-white/10">
                <span className="material-symbols-outlined text-on-primary text-[22px]">
                  storefront
                </span>
              </div>
              <div>
                <p className="font-body-md-medium text-body-md-medium text-on-primary font-semibold">
                  Marketplace directo sin comisiones por venta
                </p>
                <p className="font-body-md text-body-md text-on-primary-container mt-0.5">
                  El 100% del valor de tus ventas permanece en tu negocio y tu localidad.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3.5 group">
              <div className="w-10 h-10 rounded-lg bg-on-primary/15 backdrop-blur-sm flex items-center justify-center shrink-0 group-hover:bg-on-primary/25 transition-colors border border-white/10">
                <span className="material-symbols-outlined text-tertiary-fixed text-[22px]">
                  verified_user
                </span>
              </div>
              <div>
                <p className="font-body-md-medium text-body-md-medium text-on-primary font-semibold">
                  Comunidad con perfiles de negocios verificados
                </p>
                <p className="font-body-md text-body-md text-on-primary-container mt-0.5">
                  Validación rigurosa de identidad fiscal y comercial para compras con total confianza.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3.5 group">
              <div className="w-10 h-10 rounded-lg bg-on-primary/15 backdrop-blur-sm flex items-center justify-center shrink-0 group-hover:bg-on-primary/25 transition-colors border border-white/10">
                <span className="material-symbols-outlined text-secondary-fixed text-[22px]">
                  recommend
                </span>
              </div>
              <div>
                <p className="font-body-md-medium text-body-md-medium text-on-primary font-semibold">
                  Recomendaciones inteligentes según tus intereses
                </p>
                <p className="font-body-md text-body-md text-on-primary-container mt-0.5">
                  Descubre ofertas de cercanía e interactúa con negocios afines a tu estilo de vida.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Verified Floating Badge */}
        <div className="relative z-10 pt-2">
          <div className="p-4 rounded-xl bg-surface-container-lowest/15 backdrop-blur-md flex items-center justify-between shadow-sm border border-white/10 max-w-xl">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden border border-white/20">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    store
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-tertiary-fixed flex items-center justify-center overflow-hidden border border-white/20">
                  <span className="material-symbols-outlined text-tertiary text-[18px]">
                    person
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center overflow-hidden border border-white/20">
                  <span className="material-symbols-outlined text-secondary text-[18px]">
                    handshake
                  </span>
                </div>
              </div>
              <div>
                <p className="font-label-md text-label-md text-on-primary font-semibold">
                  +5,000 negocios locales conectados
                </p>
                <p className="font-caption text-caption text-surface-container-low">
                  Más de 24,000 transacciones este mes
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-primary/80">trending_up</span>
          </div>
        </div>
      </div>

      {/* Right Interaction Column */}
      <div className="w-full lg:w-7/12 xl:w-[54%] bg-[#F5F7FA] p-6 sm:p-10 lg:p-16 flex flex-col justify-between">
        <div className="flex justify-end items-center mb-6 lg:mb-0">
          <div className="text-right">
            <span className="font-body-md text-body-md text-on-surface-variant">
              {authMode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes una cuenta?'}
            </span>
            <button
              className="ml-1.5 text-primary hover:text-[#08427B] font-body-md-medium text-body-md-medium font-semibold hover:underline"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setErrorMessage(null);
              }}
            >
              {authMode === 'login' ? 'Crear una cuenta' : 'Iniciar sesión'}
            </button>
          </div>
        </div>

        {/* Centered Form Container */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          {/* Tab Strip */}
          <div className="p-1 rounded-xl bg-surface-variant/70 flex items-center mb-6">
            <button
              className={`flex-1 py-2.5 px-4 rounded-lg font-label-md text-label-md font-semibold transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'login'
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              onClick={() => {
                setAuthMode('login');
                setErrorMessage(null);
              }}
            >
              <span className="material-symbols-outlined text-[18px]">login</span>
              Iniciar Sesión
            </button>
            <button
              className={`flex-1 py-2.5 px-4 rounded-lg font-label-md text-label-md font-semibold transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'register'
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              onClick={() => {
                setAuthMode('register');
                setErrorMessage(null);
              }}
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Crear Cuenta
            </button>
          </div>

          {/* Error Alert Box */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-body-md font-body-md flex items-center gap-2 animate-fadeIn">
              <span className="material-symbols-outlined text-[20px] text-red-600">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {authMode === 'login' ? (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h2 className="font-headline-lg text-2xl lg:text-3xl text-on-surface font-bold tracking-tight">
                  Bienvenido de vuelta
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Ingresa tus credenciales para acceder a tu panel y marketplace.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleLoginSubmit}>
                <div className="space-y-1.5">
                  <label
                    className="font-label-md text-label-md text-on-surface font-medium flex items-center justify-between"
                    htmlFor="email"
                  >
                    <span>Correo electrónico o usuario</span>
                    <span className="font-caption text-caption text-on-surface-variant">
                      Requerido
                    </span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">
                      person
                    </span>
                    <input
                      className="w-full h-11 pl-11 pr-4 bg-surface-container-lowest rounded-lg border border-outline-variant/60 font-body-md text-body-md text-on-surface shadow-sm placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      id="email"
                      placeholder="adminpromexa o tu@correo.com"
                      required
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    className="font-label-md text-label-md text-on-surface font-medium flex items-center justify-between"
                    htmlFor="password"
                  >
                    <span>Contraseña</span>
                    <a
                      className="text-primary hover:text-primary-container font-label-sm text-label-sm font-medium transition-colors"
                      href="#"
                    >
                      ¿Olvidaste tu contraseña?
                    </a>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">
                      lock
                    </span>
                    <input
                      className="w-full h-11 pl-11 pr-11 bg-surface-container-lowest rounded-lg border border-outline-variant/60 font-body-md text-body-md text-on-surface shadow-sm placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      id="password"
                      placeholder="••••••••"
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      aria-label="Mostrar u ocultar contraseña"
                      className="absolute right-2.5 p-1 rounded-md text-outline hover:text-on-surface transition-colors"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-1">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      defaultChecked
                      className="w-4 h-4 rounded text-primary focus:ring-0 bg-surface-container-lowest cursor-pointer accent-primary border border-outline-variant"
                      id="remember"
                      type="checkbox"
                    />
                    <span className="font-body-md text-body-md text-on-surface-variant select-none">
                      Recordar mi sesión
                    </span>
                  </label>
                  <span className="inline-flex items-center gap-1 font-caption text-caption text-secondary font-medium">
                    <span className="material-symbols-outlined text-[15px]">shield</span>
                    Conexión TLS 256-bit
                  </span>
                </div>

                <button
                  className={`w-full h-12 rounded-lg font-body-md-medium text-body-md-medium font-semibold shadow-md transition-all flex items-center justify-center gap-2 ${
                    authStatus === 'success'
                      ? 'bg-[#16A34A] text-white'
                      : 'bg-primary-container hover:bg-[#08427B] text-on-primary'
                  }`}
                  disabled={authStatus === 'loading'}
                  type="submit"
                >
                  {authStatus === 'loading' && (
                    <>
                      <span>Autenticando en Promexa...</span>
                      <span className="material-symbols-outlined text-[20px] animate-spin">
                        sync
                      </span>
                    </>
                  )}
                  {authStatus === 'success' && (
                    <>
                      <span>¡Acceso Concedido! Redirigiendo...</span>
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    </>
                  )}
                  {authStatus === 'idle' && (
                    <>
                      <span>Iniciar sesión</span>
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2">
                <div className="relative flex items-center justify-center mb-4">
                  <div className="w-full h-px bg-outline-variant/50" />
                  <span className="bg-[#F5F7FA] px-3 font-caption text-caption text-on-surface-variant uppercase tracking-wider">
                    o continúa con
                  </span>
                </div>
                <button
                  className="w-full h-11 bg-surface-container-lowest hover:bg-surface-container text-primary border border-outline-variant/60 rounded-lg font-body-md-medium text-body-md-medium font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMessage(null);
                  }}
                >
                  <span className="material-symbols-outlined text-[20px]">store</span>
                  Crear una cuenta nueva (Persona o Negocio)
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h2 className="font-headline-lg text-2xl lg:text-3xl text-on-surface font-bold tracking-tight">
                  Comienza en Promexa
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Selecciona tu perfil principal para configurar tu cuenta.
                </p>
              </div>

              {/* Profile Type Radio */}
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`p-3.5 rounded-xl bg-surface-container-lowest border cursor-pointer flex flex-col gap-1 shadow-sm transition-all ${
                    profileType === 'personal'
                      ? 'border-primary bg-primary-fixed/20'
                      : 'border-outline-variant/60 hover:border-primary'
                  }`}
                  onClick={() => setProfileType('personal')}
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-primary text-[22px]">
                      person
                    </span>
                    <span
                      className={`w-3 h-3 rounded-full ${
                        profileType === 'personal'
                          ? 'bg-primary ring-2 ring-primary-container/20'
                          : 'bg-surface-variant'
                      }`}
                    />
                  </div>
                  <span className="font-body-md-medium text-body-md-medium text-on-surface font-semibold">
                    Persona / Comprador
                  </span>
                  <span className="font-caption text-caption text-on-surface-variant">
                    Compra y contacta tiendas
                  </span>
                </label>

                <label
                  className={`p-3.5 rounded-xl bg-surface-container-lowest border cursor-pointer flex flex-col gap-1 shadow-sm transition-all ${
                    profileType === 'business'
                      ? 'border-primary bg-primary-fixed/20'
                      : 'border-outline-variant/60 hover:border-primary'
                  }`}
                  onClick={() => setProfileType('business')}
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-tertiary-container text-[22px]">
                      storefront
                    </span>
                    <span
                      className={`w-3 h-3 rounded-full ${
                        profileType === 'business'
                          ? 'bg-primary ring-2 ring-primary-container/20'
                          : 'bg-surface-variant'
                      }`}
                    />
                  </div>
                  <span className="font-body-md-medium text-body-md-medium text-on-surface font-semibold">
                    Negocio Local
                  </span>
                  <span className="font-caption text-caption text-on-surface-variant">
                    Vende sin comisiones
                  </span>
                </label>
              </div>

              <form className="space-y-3.5" onSubmit={handleRegisterSubmit}>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface font-medium">
                    {profileType === 'business' ? 'Nombre del Negocio / Razón Social' : 'Nombre completo'}
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">
                      badge
                    </span>
                    <input
                      className="w-full h-11 pl-11 pr-4 bg-surface-container-lowest rounded-lg border border-outline-variant/60 font-body-md text-body-md text-on-surface shadow-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder={profileType === 'business' ? 'Ej. Distribuidora Gómez S.A.C.' : 'Ej. Lucía Valenzuela'}
                      required
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface font-medium">
                    Correo electrónico
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">
                      mail
                    </span>
                    <input
                      className="w-full h-11 pl-11 pr-4 bg-surface-container-lowest rounded-lg border border-outline-variant/60 font-body-md text-body-md text-on-surface shadow-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="contacto@negocio.com"
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface font-medium">
                    Contraseña segura
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">
                      lock
                    </span>
                    <input
                      className="w-full h-11 pl-11 pr-4 bg-surface-container-lowest rounded-lg border border-outline-variant/60 font-body-md text-body-md text-on-surface shadow-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="Mínimo 8 caracteres"
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  className={`w-full h-12 rounded-lg font-body-md-medium text-body-md-medium font-semibold shadow-md transition-all flex items-center justify-center gap-2 ${
                    authStatus === 'success'
                      ? 'bg-[#16A34A] text-white'
                      : 'bg-primary-container hover:bg-[#08427B] text-on-primary'
                  }`}
                  disabled={authStatus === 'loading'}
                  type="submit"
                >
                  {authStatus === 'loading' && (
                    <>
                      <span>Creando cuenta...</span>
                      <span className="material-symbols-outlined text-[20px] animate-spin">
                        sync
                      </span>
                    </>
                  )}
                  {authStatus === 'success' && (
                    <>
                      <span>¡Registro exitoso! Iniciando...</span>
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    </>
                  )}
                  {authStatus === 'idle' && (
                    <>
                      <span>Registrarme gratis</span>
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-6 border-t border-outline-variant/40 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4 text-on-surface-variant">
            <div className="flex items-center gap-2 font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-outline text-[18px]">language</span>
              <select className="bg-transparent font-medium text-on-surface cursor-pointer focus:outline-none pr-2">
                <option value="es">Español (Latinoamérica)</option>
                <option value="en">English (US)</option>
              </select>
            </div>
            <div className="flex items-center gap-3 font-caption text-caption">
              <a className="hover:text-primary transition-colors" href="#">
                Centro de Ayuda
              </a>
              <span>•</span>
              <a className="hover:text-primary transition-colors" href="#">
                Privacidad
              </a>
              <span>•</span>
              <a className="hover:text-primary transition-colors" href="#">
                Términos de Servicio
              </a>
            </div>
          </div>
          <p className="font-caption text-caption text-on-surface-variant/80 text-center lg:text-left">
            Al interactuar en Promexa aceptas las políticas de comercio seguro, protección contra fraude y los términos de uso comercial.
          </p>
        </div>
      </div>
    </div>
  );
}
