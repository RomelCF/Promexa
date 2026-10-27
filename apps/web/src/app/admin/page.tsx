"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function AdminDashboardPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncTimeText, setSyncTimeText] = useState(
    "Sincronizado: hace unos segundos",
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [alertStates, setAlertStates] = useState<{ [key: number]: boolean }>(
    {},
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading) {
      if (!user) {
        router.replace("/login");
      } else if (user.role !== "ADMIN") {
        router.replace("/");
      }
    }
  }, [mounted, user, isLoading, router]);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setSyncTimeText("Sincronizado: justo ahora");
      showToast("Datos actualizados en tiempo real");
    }, 700);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleAlertAction = (id: number, message: string) => {
    setAlertStates((prev) => ({ ...prev, [id]: true }));
    showToast(message);
  };

  if (!mounted || isLoading || !user || user.role !== "ADMIN") {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[#f8f9ff]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-xl shadow-md animate-pulse">
            P
          </div>
          <div className="flex items-center gap-2 text-primary font-medium text-body-md">
            <span className="material-symbols-outlined animate-spin text-[20px]">
              sync
            </span>
            <span>Verificando credenciales de administrador...</span>
          </div>
        </div>
      </div>
    );
  }

  const adminDisplayName = user.name || "adminpromexa";

  return (
    <div className="relative min-h-screen bg-surface text-on-surface font-body-md">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[999] bg-[#121c2a] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-white/10 animate-fadeIn">
          <span className="material-symbols-outlined text-[#16A34A] text-[20px]">
            check_circle
          </span>
          <span className="font-label-md text-sm">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-gray-400 hover:text-white ml-2 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      <aside className="fixed left-0 top-0 h-full w-72 bg-surface-container-lowest z-50 flex flex-col shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 px-space-lg flex items-center justify-between bg-surface-container-lowest">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[20px]">
                verified
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-primary tracking-tight">
                PROMEXA
              </span>
              <span className="font-caption text-caption text-on-surface-variant font-medium uppercase tracking-wider">
                Admin Backoffice
              </span>
            </div>
          </div>
          <span className="px-space-xs py-0.5 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm">
            v1.4.2
          </span>
        </div>
        <div className="px-space-md py-space-sm">
          <div className="px-space-sm py-1.5 rounded-lg bg-surface-container-low flex items-center justify-between">
            <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">
              Entorno
            </span>
            <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-primary font-medium">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              Producción TLS
            </span>
          </div>
        </div>
        <nav
          className="flex-1 px-space-sm py-space-sm space-y-1 overflow-y-auto"
          data-active-classes="bg-primary-container text-on-primary font-body-md-medium"
        >
          <div className="px-space-sm pt-space-xs pb-1 font-caption text-caption uppercase tracking-wider text-outline">
            Plataforma & Supervisión
          </div>
          <a
            aria-current="page"
            className="flex items-center justify-between px-space-md py-2.5 rounded-lg transition-colors bg-primary-container text-on-primary font-body-md-medium"
            data-path="dashboard"
            href="#"
          >
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-[20px]">
                dashboard
              </span>
              <span className="font-body-md text-body-md">Dashboard</span>
            </div>
          </a>
          <a
            className="flex items-center justify-between px-space-md py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            data-path="verificacion-de-negocios"
            href="#"
          >
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-[20px]">
                verified_user
              </span>
              <span className="font-body-md text-body-md">
                Verificación de Negocios
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold">
              14
            </span>
          </a>
          <Link
            href="/admin/moderacion-y-reportes"
            className="flex items-center justify-between px-space-md py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-[20px]">
                warning
              </span>
              <span className="font-body-md text-body-md">
                Moderación & Reportes
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-error text-on-error font-label-sm text-label-sm font-semibold">
              8
            </span>
          </Link>
          <a
            className="flex items-center justify-between px-space-md py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            data-path="detalle-de-solicitud-ruc"
            href="#"
          >
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-[20px]">
                description
              </span>
              <span className="font-body-md text-body-md">
                Detalle de Solicitud RUC
              </span>
            </div>
          </a>
          <div className="px-space-sm pt-space-md pb-1 font-caption text-caption uppercase tracking-wider text-outline">
            Sistemas & Contenido
          </div>
          <a
            className="flex items-center justify-between px-space-md py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            data-path="auditoria-y-salud-del-sistema"
            href="#"
          >
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-[20px]">
                pulse_alert
              </span>
              <span className="font-body-md text-body-md">
                Auditoría & Salud
              </span>
            </div>
            <span className="flex items-center gap-1 font-caption text-caption text-secondary font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>OK
            </span>
          </a>
          <Link
            className="flex items-center justify-between px-space-md py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            href="/admin/gestion-de-usuarios"
          >
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-[20px]">
                group
              </span>
              <span className="font-body-md text-body-md">
                Gestión de Usuarios
              </span>
            </div>
          </Link>
          <a
            className="flex items-center justify-between px-space-md py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            data-path="gestion-de-contenido"
            href="#"
          >
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-[20px]">
                inventory_2
              </span>
              <span className="font-body-md text-body-md">
                Gestión de Contenido
              </span>
            </div>
          </a>
        </nav>
        <div className="p-space-md bg-surface-container-low">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[18px]">
                person
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-label-md text-label-md text-on-surface truncate">
                {adminDisplayName}
              </div>
              <div className="font-caption text-caption text-on-surface-variant truncate">
                Superadmin
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-1.5 text-on-surface-variant hover:text-error transition-colors rounded-lg hover:bg-surface-container flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">
                logout
              </span>
            </button>
          </div>
        </div>
      </aside>
      <div className="pl-72 flex flex-col min-h-screen">
        <header className="fixed top-0 left-72 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-space-lg">
          <div className="flex items-center gap-space-md flex-1 max-w-2xl">
            <span className="px-space-sm py-1 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm font-medium whitespace-nowrap">
              Panel de Administración Promexa
            </span>
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                search
              </span>
              <input
                className="w-full h-10 pl-9 pr-space-md rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none transition-all"
                placeholder="Buscar usuarios, reportes, RUC, publicaciones..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-space-md">
            <div className="hidden md:flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-primary text-[16px]">
                lock
              </span>
              <span>Infraestructura Segura</span>
            </div>
            <Link
              href="/"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary font-label-sm text-label-sm transition-colors border border-outline-variant/30"
              title="Ver feed social y marketplace como usuario"
            >
              <span className="material-symbols-outlined text-[16px]">
                public
              </span>
              <span>Ir al Feed</span>
            </Link>
            <div className="relative">
              <button className="w-10 h-10 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors relative">
                <span className="material-symbols-outlined text-[20px]">
                  notifications
                </span>
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error"></span>
              </button>
            </div>
            <div className="flex items-center gap-space-sm pl-space-sm">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[18px]">
                  person
                </span>
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="font-label-md text-label-md text-on-surface">
                  {adminDisplayName}
                </span>
                <span className="font-caption text-caption text-on-surface-variant">
                  Superadmin
                </span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                expand_more
              </span>
            </div>
          </div>
        </header>
        <main className="flex-1 pt-16 w-full bg-surface px-space-lg py-space-lg">
          <div className="flex flex-col w-full space-y-space-lg">
            {/* SECTION HEADER & QUICK COMMAND BAR */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-md bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
              <div className="flex flex-col space-y-space-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-caption text-caption font-semibold tracking-wide uppercase">
                    Consola Central
                  </span>
                  <span className="flex items-center gap-1 font-caption text-caption text-on-surface-variant">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                    {syncTimeText}
                  </span>
                </div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                  Dashboard de Operaciones & Métricas
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
                  Visión general en tiempo real del ecosistema Promexa, estado
                  de moderación y actividad de la plataforma
                </p>
              </div>
              {/* Quick Action Triggers */}
              <div className="flex flex-wrap items-center gap-space-sm">
                <div className="flex items-center bg-surface-container-low rounded-lg p-1">
                  <button className="px-3 py-1.5 rounded-md bg-surface-container-lowest shadow-sm font-label-sm text-label-sm text-primary font-semibold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">
                      calendar_today
                    </span>
                    Últimos 30 días
                  </button>
                  <button
                    onClick={handleRefresh}
                    className="p-1.5 hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors rounded-md"
                    title="Actualizar datos"
                  >
                    <span
                      className={`material-symbols-outlined text-[18px] ${isRefreshing ? "animate-spin" : ""}`}
                    >
                      sync
                    </span>
                  </button>
                </div>
                {/* Accent Review Action (Orange Transactional Trigger) */}
                <a
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-tertiary-container hover:bg-tertiary text-on-tertiary font-body-md-medium text-body-md-medium shadow-sm transition-all transform active:scale-95"
                  data-path="verificacion-de-negocios"
                  href="#"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    verified_user
                  </span>
                  <span>Revisar Verificaciones (14)</span>
                </a>
                {/* Urgent Moderation Action (Red Warning) */}
                <Link
                  href="/admin/moderacion-y-reportes"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-error-container hover:bg-error text-on-error-container hover:text-on-error font-body-md-medium text-body-md-medium shadow-sm transition-all transform active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    warning
                  </span>
                  <span>Revisar Reportes Urgentes (8)</span>
                </Link>
              </div>
            </div>
            {/* 6-METRIC KPI GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-space-md">
              {/* Card 1: Total Users */}
              <Link
                className="group bg-surface-container-lowest hover:bg-surface-container-low p-space-md rounded-xl shadow-sm transition-all flex flex-col justify-between relative overflow-hidden"
                href="/admin/gestion-de-usuarios"
              >
                <div className="flex items-start justify-between">
                  <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                    Usuarios totales
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[18px]">
                      group
                    </span>
                  </div>
                </div>
                <div className="mt-space-md">
                  <div className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight">
                    28,450
                  </div>
                  <div className="flex items-center gap-1 mt-1 font-caption text-caption text-secondary font-medium">
                    <span className="material-symbols-outlined text-[14px]">
                      trending_up
                    </span>
                    <span>+12.4% vs mes anterior</span>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20 group-hover:bg-primary transition-colors"></div>
              </Link>
              {/* Card 2: Verified Businesses */}
              <a
                className="group bg-surface-container-lowest hover:bg-surface-container-low p-space-md rounded-xl shadow-sm transition-all flex flex-col justify-between relative overflow-hidden"
                data-path="verificacion-de-negocios"
                href="#"
              >
                <div className="flex items-start justify-between">
                  <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                    Negocios verificados
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[18px]">
                      store
                    </span>
                  </div>
                </div>
                <div className="mt-space-md">
                  <div className="font-headline-xl text-headline-xl text-secondary font-bold tracking-tight">
                    3,120
                  </div>
                  <div className="flex items-center gap-1 mt-1 font-caption text-caption text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[14px]">
                      verified
                    </span>
                    <span>Insignia activa / RUC OK</span>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary/20 group-hover:bg-secondary transition-colors"></div>
              </a>
              {/* Card 3: Pending Verifications (Amber) */}
              <a
                className="group bg-surface-container-lowest hover:bg-surface-container-low p-space-md rounded-xl shadow-sm transition-all flex flex-col justify-between relative overflow-hidden"
                data-path="verificacion-de-negocios"
                href="#"
              >
                <div className="flex items-start justify-between">
                  <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                    Verificaciones pendientes
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-tertiary-fixed flex items-center justify-center text-tertiary-container group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[18px]">
                      pending_actions
                    </span>
                  </div>
                </div>
                <div className="mt-space-md">
                  <div className="font-headline-xl text-headline-xl text-tertiary-container font-bold tracking-tight">
                    14
                  </div>
                  <div className="flex items-center gap-1 mt-1 font-caption text-caption text-tertiary font-medium">
                    <span className="material-symbols-outlined text-[14px]">
                      timer
                    </span>
                    <span>En cola SLA &lt; 24h</span>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-tertiary-container/20 group-hover:bg-tertiary-container transition-colors"></div>
              </a>
              {/* Card 4: Open Reports (Red) */}
              <Link
                href="/admin/moderacion-y-reportes"
                className="group bg-surface-container-lowest hover:bg-surface-container-low p-space-md rounded-xl shadow-sm transition-all flex flex-col justify-between relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                    Reportes abiertos
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-error-container flex items-center justify-center text-error group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[18px]">
                      flag
                    </span>
                  </div>
                </div>
                <div className="mt-space-md">
                  <div className="font-headline-xl text-headline-xl text-error font-bold tracking-tight">
                    8
                  </div>
                  <div className="flex items-center gap-1 mt-1 font-caption text-caption text-error font-medium">
                    <span className="material-symbols-outlined text-[14px]">
                      priority_high
                    </span>
                    <span>3 con &gt;3 denuncias</span>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-error/20 group-hover:bg-error transition-colors"></div>
              </Link>
              {/* Card 5: Publications Today (Blue) */}
              <a
                className="group bg-surface-container-lowest hover:bg-surface-container-low p-space-md rounded-xl shadow-sm transition-all flex flex-col justify-between relative overflow-hidden"
                data-path="gestion-de-contenido"
                href="#"
              >
                <div className="flex items-start justify-between">
                  <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                    Publicaciones hoy
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[18px]">
                      dynamic_feed
                    </span>
                  </div>
                </div>
                <div className="mt-space-md">
                  <div className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight">
                    1,420
                  </div>
                  <div className="flex items-center gap-1 mt-1 font-caption text-caption text-on-surface-variant">
                    <span className="material-symbols-outlined text-[14px]">
                      forum
                    </span>
                    <span>Feed social activo</span>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20 group-hover:bg-primary transition-colors"></div>
              </a>
              {/* Card 6: Active Products (Blue) */}
              <a
                className="group bg-surface-container-lowest hover:bg-surface-container-low p-space-md rounded-xl shadow-sm transition-all flex flex-col justify-between relative overflow-hidden"
                data-path="gestion-de-contenido"
                href="#"
              >
                <div className="flex items-start justify-between">
                  <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                    Productos activos
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[18px]">
                      shopping_bag
                    </span>
                  </div>
                </div>
                <div className="mt-space-md">
                  <div className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight">
                    9,840
                  </div>
                  <div className="flex items-center gap-1 mt-1 font-caption text-caption text-on-surface-variant">
                    <span className="material-symbols-outlined text-[14px]">
                      inventory_2
                    </span>
                    <span>En marketplace P2P/B2C</span>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20 group-hover:bg-primary transition-colors"></div>
              </a>
            </div>
            {/* ANALYTICAL CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
              {/* Chart 1: Daily User Registrations (8 Cols) */}
              <div className="lg:col-span-8 bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-xs pb-space-md">
                  <div>
                    <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">
                      Registros de Usuarios por Día
                    </h2>
                    <p className="font-caption text-caption text-on-surface-variant">
                      Últimos 30 días de tracción: Personas naturales vs.
                      Cuentas comerciales
                    </p>
                  </div>
                  <div className="flex items-center gap-space-md">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-primary"></span>
                      <span className="font-label-sm text-label-sm text-on-surface">
                        Usuarios Persona
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-tertiary-container"></span>
                      <span className="font-label-sm text-label-sm text-on-surface">
                        Comercios / RUC
                      </span>
                    </div>
                  </div>
                </div>
                {/* Interactive SVG Line Chart */}
                <div className="relative w-full h-72 pt-4">
                  <svg
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                    viewBox="0 0 760 220"
                  >
                    <defs>
                      <linearGradient
                        id="areaGradientUser"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#1168BD"
                          stopOpacity="0.25"
                        />
                        <stop
                          offset="100%"
                          stopColor="#1168BD"
                          stopOpacity="0.0"
                        />
                      </linearGradient>
                      <linearGradient
                        id="areaGradientBiz"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#9E5500"
                          stopOpacity="0.2"
                        />
                        <stop
                          offset="100%"
                          stopColor="#9E5500"
                          stopOpacity="0.0"
                        />
                      </linearGradient>
                    </defs>
                    {/* Horizontal Grid Lines */}
                    <line
                      stroke="#E6EEFF"
                      strokeWidth="1.5"
                      x1="0"
                      x2="760"
                      y1="200"
                      y2="200"
                    />
                    <line
                      stroke="#E6EEFF"
                      strokeDasharray="4,4"
                      strokeWidth="1.5"
                      x1="0"
                      x2="760"
                      y1="150"
                      y2="150"
                    />
                    <line
                      stroke="#E6EEFF"
                      strokeDasharray="4,4"
                      strokeWidth="1.5"
                      x1="0"
                      x2="760"
                      y1="100"
                      y2="100"
                    />
                    <line
                      stroke="#E6EEFF"
                      strokeDasharray="4,4"
                      strokeWidth="1.5"
                      x1="0"
                      x2="760"
                      y1="50"
                      y2="50"
                    />
                    {/* Background Area Fill (Users) */}
                    <path
                      d="M 0,170 C 60,160 120,120 180,135 C 240,150 300,90 360,95 C 420,100 480,50 540,40 C 600,30 660,75 720,45 L 760,35 L 760,200 L 0,200 Z"
                      fill="url(#areaGradientUser)"
                    />
                    {/* Background Area Fill (Businesses) */}
                    <path
                      d="M 0,190 C 80,185 160,175 240,170 C 320,165 400,150 480,140 C 560,130 640,120 720,105 L 760,95 L 760,200 L 0,200 Z"
                      fill="url(#areaGradientBiz)"
                    />
                    {/* Line 1: Primary Users Path */}
                    <path
                      d="M 0,170 C 60,160 120,120 180,135 C 240,150 300,90 360,95 C 420,100 480,50 540,40 C 600,30 660,75 720,45 L 760,35"
                      fill="none"
                      stroke="#1168BD"
                      strokeLinecap="round"
                      strokeWidth="3"
                    />
                    {/* Line 2: Businesses Path */}
                    <path
                      d="M 0,190 C 80,185 160,175 240,170 C 320,165 400,150 480,140 C 560,130 640,120 720,105 L 760,95"
                      fill="none"
                      stroke="#9E5500"
                      strokeLinecap="round"
                      strokeWidth="2.5"
                    />
                    {/* Peak Data Points */}
                    <circle
                      className="cursor-pointer hover:r-7 transition-all"
                      cx="540"
                      cy="40"
                      fill="#1168BD"
                      r="5"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                    <circle
                      className="cursor-pointer hover:r-7 transition-all"
                      cx="720"
                      cy="45"
                      fill="#1168BD"
                      r="5"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                    <circle
                      cx="720"
                      cy="105"
                      fill="#9E5500"
                      r="4"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                  </svg>
                  {/* Static Tooltip Pill on Peak Day */}
                  <div className="absolute top-2 left-[66%] -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-3 py-1.5 rounded-lg shadow-md pointer-events-none flex flex-col items-center">
                    <span className="font-caption text-caption opacity-80">
                      Día 24 • Pico Histórico
                    </span>
                    <span className="font-label-sm text-label-sm font-semibold">
                      +184 Personas / +38 RUC
                    </span>
                  </div>
                </div>
                {/* X-Axis Labels */}
                <div className="flex justify-between items-center pt-2 text-on-surface-variant font-caption text-caption">
                  <span>Día 01</span>
                  <span>Día 06</span>
                  <span>Día 12</span>
                  <span>Día 18</span>
                  <span>Día 24</span>
                  <span>Día 30</span>
                </div>
              </div>
              {/* Chart 2: Product State Donut Distribution (4 Cols) */}
              <div className="lg:col-span-4 bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between">
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">
                    Distribución por Estado
                  </h2>
                  <p className="font-caption text-caption text-on-surface-variant">
                    Catálogo global de 9,840 productos
                  </p>
                </div>
                {/* Donut Visual */}
                <div className="relative flex items-center justify-center my-4">
                  <svg
                    className="w-48 h-48 transform -rotate-90"
                    viewBox="0 0 36 36"
                  >
                    {/* Background circle track */}
                    <path
                      className="text-surface-container-high"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4.5"
                    />
                    {/* 78% Disponibles (Green #16A34A / stroke-secondary) */}
                    <path
                      className="text-secondary transition-all duration-700 ease-out"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray="78, 100"
                      strokeLinecap="round"
                      strokeWidth="4.5"
                    />
                    {/* 15% Reservados (Amber offset) */}
                    <path
                      className="text-tertiary-container transition-all duration-700 ease-out"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray="15, 100"
                      strokeDashoffset="-78"
                      strokeLinecap="round"
                      strokeWidth="4.5"
                    />
                    {/* 7% No disponibles (Red offset) */}
                    <path
                      className="text-error transition-all duration-700 ease-out"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray="7, 100"
                      strokeDashoffset="-93"
                      strokeLinecap="round"
                      strokeWidth="4.5"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="font-headline-lg text-headline-lg text-on-surface font-bold">
                      78%
                    </span>
                    <span className="font-caption text-caption uppercase tracking-wider text-secondary font-medium">
                      Disponibles
                    </span>
                  </div>
                </div>
                {/* Breakdown Legend with counts */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                      <span className="font-body-md text-body-md text-on-surface">
                        Disponible
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-body-md-medium text-body-md-medium text-on-surface">
                        7,675
                      </span>
                      <span className="font-caption text-caption text-secondary font-semibold">
                        78%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container"></span>
                      <span className="font-body-md text-body-md text-on-surface">
                        Reservado
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-body-md-medium text-body-md-medium text-on-surface">
                        1,476
                      </span>
                      <span className="font-caption text-caption text-tertiary-container font-semibold">
                        15%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-error"></span>
                      <span className="font-body-md text-body-md text-on-surface">
                        No disponible
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-body-md-medium text-body-md-medium text-on-surface">
                        689
                      </span>
                      <span className="font-caption text-caption text-error font-semibold">
                        7%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Chart 3: Weekly Activity Bar Comparison (12 Cols) */}
              <div className="lg:col-span-12 bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-xs pb-space-lg">
                  <div>
                    <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">
                      Actividad Semanal: Publicaciones en Feed vs. Nuevos
                      Productos
                    </h2>
                    <p className="font-caption text-caption text-on-surface-variant">
                      Rendimiento cruzado del dinamismo de red social frente al
                      volumen comercial (Últimas 8 semanas)
                    </p>
                  </div>
                  <div className="flex items-center gap-space-md">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3 rounded-sm bg-primary"></span>
                      <span className="font-label-sm text-label-sm text-on-surface">
                        Posts Feed Social
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3 rounded-sm bg-tertiary-container"></span>
                      <span className="font-label-sm text-label-sm text-on-surface">
                        Nuevos Productos Marketplace
                      </span>
                    </div>
                  </div>
                </div>
                {/* Grouped Bar Chart Visual */}
                <div className="grid grid-cols-8 gap-2 sm:gap-6 items-end h-64 w-full pt-6 pb-2">
                  {/* Week 1 */}
                  <div className="flex flex-col items-center h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full">
                      <div
                        className="w-3 sm:w-6 bg-primary rounded-t-sm group-hover:opacity-85 transition-all"
                        style={{ height: "48%" }}
                        title="Posts: 5,400"
                      ></div>
                      <div
                        className="w-3 sm:w-6 bg-tertiary-container rounded-t-sm group-hover:opacity-85 transition-all"
                        style={{ height: "32%" }}
                        title="Productos: 1,820"
                      ></div>
                    </div>
                    <span className="mt-2 font-caption text-caption text-on-surface-variant font-medium">
                      Sem 01
                    </span>
                  </div>
                  {/* Week 2 */}
                  <div className="flex flex-col items-center h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full">
                      <div
                        className="w-3 sm:w-6 bg-primary rounded-t-sm group-hover:opacity-85 transition-all"
                        style={{ height: "54%" }}
                        title="Posts: 6,100"
                      ></div>
                      <div
                        className="w-3 sm:w-6 bg-tertiary-container rounded-t-sm group-hover:opacity-85 transition-all"
                        style={{ height: "38%" }}
                        title="Productos: 2,150"
                      ></div>
                    </div>
                    <span className="mt-2 font-caption text-caption text-on-surface-variant font-medium">
                      Sem 02
                    </span>
                  </div>
                  {/* Week 3 */}
                  <div className="flex flex-col items-center h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full">
                      <div
                        className="w-3 sm:w-6 bg-primary rounded-t-sm group-hover:opacity-85 transition-all"
                        style={{ height: "62%" }}
                        title="Posts: 7,050"
                      ></div>
                      <div
                        className="w-3 sm:w-6 bg-tertiary-container rounded-t-sm group-hover:opacity-85 transition-all"
                        style={{ height: "44%" }}
                        title="Productos: 2,490"
                      ></div>
                    </div>
                    <span className="mt-2 font-caption text-caption text-on-surface-variant font-medium">
                      Sem 03
                    </span>
                  </div>
                  {/* Week 4 */}
                  <div className="flex flex-col items-center h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full">
                      <div
                        className="w-3 sm:w-6 bg-primary rounded-t-sm group-hover:opacity-85 transition-all"
                        style={{ height: "59%" }}
                        title="Posts: 6,800"
                      ></div>
                      <div
                        className="w-3 sm:w-6 bg-tertiary-container rounded-t-sm group-hover:opacity-85 transition-all"
                        style={{ height: "49%" }}
                        title="Productos: 2,750"
                      ></div>
                    </div>
                    <span className="mt-2 font-caption text-caption text-on-surface-variant font-medium">
                      Sem 04
                    </span>
                  </div>
                  {/* Week 5 */}
                  <div className="flex flex-col items-center h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full">
                      <div
                        className="w-3 sm:w-6 bg-primary rounded-t-sm group-hover:opacity-85 transition-all"
                        style={{ height: "71%" }}
                        title="Posts: 8,200"
                      ></div>
                      <div
                        className="w-3 sm:w-6 bg-tertiary-container rounded-t-sm group-hover:opacity-85 transition-all"
                        style={{ height: "56%" }}
                        title="Productos: 3,100"
                      ></div>
                    </div>
                    <span className="mt-2 font-caption text-caption text-on-surface-variant font-medium">
                      Sem 05
                    </span>
                  </div>
                  {/* Week 6 */}
                  <div className="flex flex-col items-center h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full">
                      <div
                        className="w-3 sm:w-6 bg-primary rounded-t-sm group-hover:opacity-85 transition-all"
                        style={{ height: "79%" }}
                        title="Posts: 9,120"
                      ></div>
                      <div
                        className="w-3 sm:w-6 bg-tertiary-container rounded-t-sm group-hover:opacity-85 transition-all"
                        style={{ height: "61%" }}
                        title="Productos: 3,420"
                      ></div>
                    </div>
                    <span className="mt-2 font-caption text-caption text-on-surface-variant font-medium">
                      Sem 06
                    </span>
                  </div>
                  {/* Week 7 */}
                  <div className="flex flex-col items-center h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full">
                      <div
                        className="w-3 sm:w-6 bg-primary rounded-t-sm group-hover:opacity-85 transition-all"
                        style={{ height: "84%" }}
                        title="Posts: 9,750"
                      ></div>
                      <div
                        className="w-3 sm:w-6 bg-tertiary-container rounded-t-sm group-hover:opacity-85 transition-all"
                        style={{ height: "68%" }}
                        title="Productos: 3,840"
                      ></div>
                    </div>
                    <span className="mt-2 font-caption text-caption text-on-surface-variant font-medium">
                      Sem 07
                    </span>
                  </div>
                  {/* Week 8 (Current) */}
                  <div className="flex flex-col items-center h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full">
                      <div
                        className="w-3 sm:w-6 bg-primary rounded-t-sm group-hover:opacity-85 transition-all"
                        style={{ height: "94%" }}
                        title="Posts: 10,840 (En curso)"
                      ></div>
                      <div
                        className="w-3 sm:w-6 bg-tertiary-container rounded-t-sm group-hover:opacity-85 transition-all"
                        style={{ height: "78%" }}
                        title="Productos: 4,410 (En curso)"
                      ></div>
                    </div>
                    <span className="mt-2 font-caption text-caption text-primary font-bold">
                      Sem 08 (Hoy)
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {/* OPERATIONAL SUMMARY ROW (SPLIT PANELS) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
              {/* Panel 1: Latest Incoming RUC Applications */}
              <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between pb-space-md">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[18px]">
                        verified
                      </span>
                    </div>
                    <div>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface">
                        Últimas Solicitudes RUC Entrantes
                      </h3>
                      <p className="font-caption text-caption text-on-surface-variant">
                        Expedientes comerciales pendientes de cotejo SUNAT
                      </p>
                    </div>
                  </div>
                  <a
                    className="font-label-sm text-label-sm text-primary hover:underline font-semibold"
                    data-path="verificacion-de-negocios"
                    href="#"
                  >
                    Ver todas (14)
                  </a>
                </div>
                <div className="space-y-space-sm divide-y-0">
                  {/* Item 1: Boutique Lima */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors">
                    <div className="flex items-center gap-3">
                      <img
                        className="w-10 h-10 rounded-lg object-cover bg-surface-container-high"
                        data-alt="Logotipo moderno y minimalista de una tienda de modas llamada Boutique Lima, tipografia elegante sobre fondo azul marino, iluminacion suave de estudio fotografico corporativo"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGaQDik0vP60Zh0yDWuKc5DIgzDEeiOyO9xQpx-F-l9XZIolxwHtMAi-OhbM-8KjaoMha8uW63keO2A-oWIN7hvSbPxhxC7ko33Fd0_icPoQllrvtriN4ay6Dyq9cNuVRH6fzqsYfJ2X2zX2j9iPApn56098VEY-tMu30kLuSr_YeBzH3JRq2M5DSK0YKZCRQuQfm1MYDljtOmyWF39cHRast7NBTWzYZKik2madARyrztjYNM-wXV"
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-body-md-medium text-body-md-medium text-on-surface">
                            Boutique Lima S.A.C.
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-caption text-caption font-semibold">
                            RUC 20608912341
                          </span>
                        </div>
                        <span className="font-caption text-caption text-on-surface-variant">
                          Moda & Textil • Recibido hace 28 min
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-secondary-container font-label-sm text-label-sm font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                        En revisión
                      </span>
                      <a
                        className="p-1.5 hover:bg-surface-container-lowest rounded-md text-on-surface-variant hover:text-primary transition-colors"
                        data-path="detalle-de-solicitud-ruc"
                        href="#"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          visibility
                        </span>
                      </a>
                    </div>
                  </div>
                  {/* Item 2: Cafe Altura */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors">
                    <div className="flex items-center gap-3">
                      <img
                        className="w-10 h-10 rounded-lg object-cover bg-surface-container-high"
                        data-alt="Emblema artesanal de una cafeteria de especialidad llamada Cafe Altura, grano de cafe con tonos calidos tostados, diseno corporativo y limpio para comercio"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCI7b0Yha4BqwvtIBtuhgAKSBTQqnXLqj4Qws8xxZPc2VdHGjFhTmPs4tPFW0VKjDUfT9g1pu9ZpFF7qmhi0tg-JpbY3VR0KZA8ESqBJyQZ0aBtf9aQwH8DCTM8F62VeCyD36RarYvo5i85VMqATDF4C0IAexQOvCuwVuABy3SSiJMdACMoeBPMs_ZpJqieBx71p7YfKRfATiaAogDMuiQa-OALib-pAZt7tWG-vF8FLfqzs7u1uSnO"
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-body-md-medium text-body-md-medium text-on-surface">
                            Café Altura E.I.R.L.
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-caption text-caption font-semibold">
                            RUC 10452398412
                          </span>
                        </div>
                        <span className="font-caption text-caption text-on-surface-variant">
                          Alimentos & Gourmet • Recibido hace 1h 12m
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse"></span>
                        Docs adjuntos
                      </span>
                      <a
                        className="p-1.5 hover:bg-surface-container-lowest rounded-md text-on-surface-variant hover:text-primary transition-colors"
                        data-path="detalle-de-solicitud-ruc"
                        href="#"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          visibility
                        </span>
                      </a>
                    </div>
                  </div>
                  {/* Item 3: Tech Import */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors">
                    <div className="flex items-center gap-3">
                      <img
                        className="w-10 h-10 rounded-lg object-cover bg-surface-container-high"
                        data-alt="Isotipo tecnologico vanguardista de distribuidor de electronica Tech Import, estilo cibernetico formal con acentos azul y plata sobre fondo neutro"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuC9m937ccF8FbsFkR_Lt8Z8jKGHGQWPdzKG683A3u6nAwGRDqyac_XnKzePQolJpAAcG_GVeBgcopPq_CgrKRTb5E-NIZgg_v09DJYy6Ar9vE3xTmwtvw_Mo7e8B9QiOoCo4WBpZU9Wcq0z-leXF5QgkLnw-dTiPasMy-gw859Gv4pRNGVSY91DununRw91RuSSLlbvLvkbEMWGfCvKUkev2yxk5Q9LaRs1JkV7dkhc8y-ms0r5udxQ"
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-body-md-medium text-body-md-medium text-on-surface">
                            Tech Import del Perú S.R.L.
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-caption text-caption font-semibold">
                            RUC 20554109873
                          </span>
                        </div>
                        <span className="font-caption text-caption text-on-surface-variant">
                          Electrónica • Recibido hace 2h 45m
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-secondary-container font-label-sm text-label-sm font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                        En revisión
                      </span>
                      <a
                        className="p-1.5 hover:bg-surface-container-lowest rounded-md text-on-surface-variant hover:text-primary transition-colors"
                        data-path="detalle-de-solicitud-ruc"
                        href="#"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          visibility
                        </span>
                      </a>
                    </div>
                  </div>
                </div>
                <div className="pt-3">
                  <a
                    className="w-full py-2 bg-surface-container-low hover:bg-surface-container text-primary font-body-md-medium text-body-md-medium rounded-lg text-center transition-colors block"
                    data-path="verificacion-de-negocios"
                    href="#"
                  >
                    Abrir Mesa de Validación RUC
                  </a>
                </div>
              </div>
              {/* Panel 2: Moderation & Escalation Alerts */}
              <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between pb-space-md">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-error-container flex items-center justify-center text-error">
                      <span className="material-symbols-outlined text-[18px]">
                        warning
                      </span>
                    </div>
                    <div>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface">
                        Alertas de Moderación Recientes
                      </h3>
                      <p className="font-caption text-caption text-on-surface-variant">
                        Contenido flaggeado por múltiples denuncias o filtros de
                        fraude
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/admin/moderacion-y-reportes"
                    className="font-label-sm text-label-sm text-error hover:underline font-semibold"
                  >
                    Ver cola (8)
                  </Link>
                </div>
                <div className="space-y-space-sm">
                  {/* Alert 1: High Severity Fraud / Price Spoof */}
                  <div className="p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-error-container text-error flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[18px]">
                          gavel
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-body-md-medium text-body-md-medium text-on-surface">
                            Publicación sospechosa: "iPhone 15 Pro Max S/ 450"
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-error text-on-error font-label-sm text-label-sm font-semibold">
                            4 denuncias
                          </span>
                        </div>
                        <span className="font-caption text-caption text-on-surface-variant">
                          Vendedor: @carlos_gadgets99 • Causa: Posible Phishing
                          / Estafa • Hace 15m
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() =>
                          handleAlertAction(
                            1,
                            "Publicación bloqueada exitosamente",
                          )
                        }
                        className={`px-3 py-1.5 rounded-md font-label-sm text-label-sm transition-all ${alertStates[1] ? "bg-surface-container-high text-on-surface-variant cursor-default" : "bg-error text-on-error hover:opacity-90 active:scale-95"}`}
                      >
                        {alertStates[1] ? "Bloqueado" : "Bloquear"}
                      </button>
                      <Link
                        href="/admin/moderacion-y-reportes"
                        className="p-1.5 hover:bg-surface-container-lowest rounded-md text-on-surface-variant hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          open_in_new
                        </span>
                      </Link>
                    </div>
                  </div>
                  {/* Alert 2: Mass Spam in Feed */}
                  <div className="p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-tertiary-fixed text-tertiary-container flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[18px]">
                          report
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-body-md-medium text-body-md-medium text-on-surface">
                            Spam repetitivo de enlaces externos en Feed
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary font-label-sm text-label-sm font-semibold">
                            3 denuncias
                          </span>
                        </div>
                        <span className="font-caption text-caption text-on-surface-variant">
                          Usuario: @ganadinerorapido_pe • Patrón de bot
                          detectado • Hace 42m
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() =>
                          handleAlertAction(
                            2,
                            "Usuario @ganadinerorapido_pe silenciado por 48h",
                          )
                        }
                        className={`px-3 py-1.5 rounded-md font-label-sm text-label-sm transition-all ${alertStates[2] ? "bg-secondary-fixed text-on-secondary-fixed font-semibold" : "bg-surface-container-high text-on-surface hover:bg-surface-container active:scale-95"}`}
                      >
                        {alertStates[2] ? "Silenciado" : "Silenciar"}
                      </button>
                      <Link
                        href="/admin/moderacion-y-reportes"
                        className="p-1.5 hover:bg-surface-container-lowest rounded-md text-on-surface-variant hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          open_in_new
                        </span>
                      </Link>
                    </div>
                  </div>
                  {/* Alert 3: Counterfeit Product Listing */}
                  <div className="p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-error-container text-error flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[18px]">
                          flip_camera_ios
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-body-md-medium text-body-md-medium text-on-surface">
                            Infracción Marcaria: "Zapatillas Nike Replicas 1:1"
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-error text-on-error font-label-sm text-label-sm font-semibold">
                            Crítico
                          </span>
                        </div>
                        <span className="font-caption text-caption text-on-surface-variant">
                          Catálogo Marketplace • Flag por algoritmo de
                          protección intelectual
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() =>
                          handleAlertAction(
                            3,
                            "Producto retirado del marketplace por infracción",
                          )
                        }
                        className={`px-3 py-1.5 rounded-md font-label-sm text-label-sm transition-all ${alertStates[3] ? "bg-surface-container-high text-on-surface-variant cursor-default" : "bg-error text-on-error hover:opacity-90 active:scale-95"}`}
                      >
                        {alertStates[3] ? "Retirado" : "Retirar"}
                      </button>
                      <Link
                        href="/admin/moderacion-y-reportes"
                        className="p-1.5 hover:bg-surface-container-lowest rounded-md text-on-surface-variant hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          open_in_new
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="pt-3">
                  <Link
                    href="/admin/moderacion-y-reportes"
                    className="w-full py-2 bg-error-container text-on-error-container hover:bg-error hover:text-on-error font-body-md-medium text-body-md-medium rounded-lg text-center transition-colors block"
                  >
                    Atender Cola de Reportes Pendientes
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
        <footer className="w-full bg-surface-container-lowest py-space-md px-space-lg">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-space-xs font-caption text-caption text-on-surface-variant">
            <span>
              Promexa Enterprise Backoffice © 2025. Todos los derechos
              reservados.
            </span>
            <div className="flex items-center gap-space-md">
              <span>Versión del sistema: v1.4.2</span>
              <span className="text-outline">•</span>
              <span className="text-error font-medium">
                Uso Interno Estrictamente Confidencial
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
