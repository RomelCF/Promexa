"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function ModeracionReportesPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "todos" | "posts" | "productos" | "comentarios" | "perfiles"
  >("todos");
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [dismissedRows, setDismissedRows] = useState<Set<number>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const allRowIds = [1, 2, 3, 4];
  const masterChecked =
    allRowIds.length > 0 && allRowIds.every((id) => selectedRows.has(id));

  const handleToggleMaster = () => {
    if (masterChecked) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(allRowIds));
    }
  };

  const handleToggleRow = (id: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDismiss = () => {
    const count = selectedRows.size;
    if (count === 0) return;
    setDismissedRows((prev) => {
      const next = new Set(prev);
      selectedRows.forEach((id) => next.add(id));
      return next;
    });
    setSelectedRows(new Set());
    showToast(`Se han descartado ${count} reporte(s) seleccionado(s).`);
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
            <span>Cargando bandeja de moderación...</span>
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
          <Link
            href="/admin"
            className="flex items-center justify-between px-space-md py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-[20px]">
                dashboard
              </span>
              <span className="font-body-md text-body-md">Dashboard</span>
            </div>
          </Link>
          <a
            className="flex items-center justify-between px-space-md py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            href="/admin"
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
            aria-current="page"
            href="/admin/moderacion-y-reportes"
            className="flex items-center justify-between px-space-md py-2.5 rounded-lg transition-colors bg-primary-container text-on-primary font-body-md-medium"
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
            href="/admin"
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
            href="/admin"
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
            href="/admin"
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
              title="Ver feed social y marketplace"
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
          <div className="flex flex-col w-full">
            {/* Dynamic Top Bar & Page Summary */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md mb-space-lg">
              <div>
                <div className="flex items-center gap-space-sm mb-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
                    Bandeja de Moderación A6
                  </span>
                  <span className="text-outline font-caption text-caption">
                    •
                  </span>
                  <span className="font-caption text-caption text-on-surface-variant font-medium">
                    Protocolo de Confianza y Transparencia Promexa
                  </span>
                </div>
                <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
                  Bandeja de Moderación de Contenido
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-3xl">
                  Gestión centralizada de denuncias sobre publicaciones,
                  productos, comentarios y perfiles de usuario. Supervisión
                  reactiva y triaje automatizado con SLA prioritario.
                </p>
              </div>
              {/* Global Bulk & Export Actions */}
              <div className="flex items-center gap-space-sm flex-wrap sm:flex-nowrap">
                <button
                  onClick={handleBulkDismiss}
                  disabled={selectedRows.size === 0}
                  id="btn-bulk-dismiss"
                  className={`px-space-md py-2 rounded-lg font-label-md text-label-md flex items-center gap-1.5 transition-all ${selectedRows.size > 0 ? "bg-error-container text-on-error-container hover:bg-error hover:text-on-error shadow-sm cursor-pointer" : "bg-surface-container-high text-on-surface-variant opacity-60 cursor-not-allowed"}`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    done_all
                  </span>
                  <span>Descartar seleccionados</span>
                  {selectedRows.size > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-error text-on-error font-caption text-caption font-bold animate-fadeIn">
                      {selectedRows.size}
                    </span>
                  )}
                </button>
                <button className="px-space-md py-2 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md shadow-sm hover:bg-surface-container-low transition-colors flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-secondary">
                    download
                  </span>
                  <span>Exportar incidencias</span>
                </button>
              </div>
            </div>
            {/* Real-time SLA KPI Strip */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md mb-space-lg">
              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">
                    Tiempo Promedio Resolución
                  </span>
                  <span className="font-headline-lg text-headline-lg text-primary mt-0.5">
                    1h 14m
                  </span>
                  <span className="font-caption text-caption text-secondary flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[14px]">
                      trending_down
                    </span>{" "}
                    -18% vs objetivo máximo (2h)
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[22px]">
                    timer
                  </span>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">
                    Casos Críticos (&gt;3 reportes)
                  </span>
                  <span className="font-headline-lg text-headline-lg text-error mt-0.5">
                    2 casos
                  </span>
                  <span className="font-caption text-caption text-error font-medium flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-error"></span>{" "}
                    Prioridad de intervención inmediata
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-error-container flex items-center justify-center text-error">
                  <span className="material-symbols-outlined text-[22px]">
                    gavel
                  </span>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">
                    Cumplimiento SLA Objetivo
                  </span>
                  <span className="font-headline-lg text-headline-lg text-on-surface mt-0.5">
                    96.8%
                  </span>
                  <span className="font-caption text-caption text-on-surface-variant mt-0.5">
                    Objetivo institucional: &gt;95.0%
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[22px]">
                    verified
                  </span>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">
                    Moderadores de Guardia
                  </span>
                  <span className="font-headline-lg text-headline-lg text-on-surface mt-0.5">
                    4 activos
                  </span>
                  <span className="font-caption text-caption text-on-surface-variant flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>{" "}
                    admin01, admin02, mod_soc, ai_guard
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[22px]">
                    support_agent
                  </span>
                </div>
              </div>
            </div>
            {/* Tabbed Filtering Bar */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden mb-space-md">
              <div className="flex items-center overflow-x-auto px-space-md pt-2 bg-surface-container-low/50">
                <button
                  onClick={() => setActiveTab('todos')}
                  className={`flex items-center gap-2 py-3 px-space-md font-label-md text-label-md font-semibold rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'todos' ? 'text-primary bg-surface-container-lowest shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    inbox
                  </span>
                  <span>Todos</span>
                  <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${activeTab === 'todos' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'}`}>
                    18
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`flex items-center gap-2 py-3 px-space-md font-label-md text-label-md font-semibold rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'posts' ? 'text-primary bg-surface-container-lowest shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    dynamic_feed
                  </span>
                  <span>Publicaciones</span>
                  <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-medium ${activeTab === 'posts' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'}`}>
                    8 pendientes
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('productos')}
                  className={`flex items-center gap-2 py-3 px-space-md font-label-md text-label-md font-semibold rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'productos' ? 'text-primary bg-surface-container-lowest shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    storefront
                  </span>
                  <span>Productos</span>
                  <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-medium ${activeTab === 'productos' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'}`}>
                    5 pendientes
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('comentarios')}
                  className={`flex items-center gap-2 py-3 px-space-md font-label-md text-label-md font-semibold rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'comentarios' ? 'text-primary bg-surface-container-lowest shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    forum
                  </span>
                  <span>Comentarios</span>
                  <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-medium ${activeTab === 'comentarios' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'}`}>
                    3 pendientes
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('perfiles')}
                  className={`flex items-center gap-2 py-3 px-space-md font-label-md text-label-md font-semibold rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'perfiles' ? 'text-primary bg-surface-container-lowest shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    account_box
                  </span>
                  <span>Perfiles</span>
                  <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-medium ${activeTab === 'perfiles' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'}`}>
                    2 pendientes
                  </span>
                </button>
              </div>
              {/* Filters & Search Controls Strip */}
              <div className="p-space-md bg-surface-container-lowest grid grid-cols-1 md:grid-cols-12 gap-space-sm items-center">
                {/* Search Input */}
                <div className="md:col-span-4 relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                    search
                  </span>
                  <input
                    className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline font-body-md text-body-md focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                    placeholder="Buscar por texto, palabra clave o autor..."
                    type="text"
                  />
                </div>
                {/* State Multi-Filter */}
                <div className="md:col-span-2 relative">
                  <select className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary focus:outline-none transition-all cursor-pointer">
                    <option value="">Estado: Todos</option>
                    <option value="abierto">🔴 Abierto</option>
                    <option value="revision">🟡 En revisión</option>
                    <option value="resuelto">🟢 Resuelto</option>
                    <option value="descartado">⚪ Descartado</option>
                  </select>
                </div>
                {/* Motivo Principal */}
                <div className="md:col-span-2 relative">
                  <select className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary focus:outline-none transition-all cursor-pointer">
                    <option value="">Motivo: Todos</option>
                    <option value="fraude">Estafa / Fraude</option>
                    <option value="spam">Spam masivo</option>
                    <option value="falsificado">
                      Producto prohibido / Réplica
                    </option>
                    <option value="acoso">Acoso o difamación</option>
                    <option value="enganoso">Contenido engañoso</option>
                  </select>
                </div>
                {/* Rango de Fechas */}
                <div className="md:col-span-2 relative">
                  <div className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface flex items-center justify-between font-label-md text-label-md cursor-pointer hover:bg-surface-container-high transition-colors">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="material-symbols-outlined text-[16px] text-outline">
                        calendar_today
                      </span>
                      <span>Últimas 48 horas</span>
                    </div>
                    <span className="material-symbols-outlined text-[16px] text-outline">
                      expand_more
                    </span>
                  </div>
                </div>
                {/* Sort Filter */}
                <div className="md:col-span-2 relative">
                  <select
                    defaultValue="reports_desc"
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary focus:outline-none transition-all cursor-pointer font-medium"
                  >
                    <option value="reports_desc">
                      + Reportes primero (Default)
                    </option>
                    <option value="reports_asc">- Reportes primero</option>
                    <option value="date_asc">Más antiguos primero</option>
                    <option value="date_desc">Más recientes primero</option>
                  </select>
                </div>
              </div>
            </div>
            {/* Reported Content Table Container */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden mb-space-lg">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface-variant font-caption text-caption uppercase tracking-wider font-semibold">
                      <th className="py-3.5 px-4 w-12 text-center">
                        <input
                          className="w-4 h-4 rounded bg-surface-container text-primary accent-primary cursor-pointer"
                          id="master-checkbox"
                          title="Seleccionar todos los elementos"
                          type="checkbox"
                          checked={masterChecked}
                          onChange={handleToggleMaster}
                        />
                      </th>
                      <th className="py-3.5 px-3 w-16">Vista Previa</th>
                      <th className="py-3.5 px-4 min-w-[260px]">
                        Contenido Denunciado
                      </th>
                      <th className="py-3.5 px-4 min-w-[170px]">Autor</th>
                      <th className="py-3.5 px-4 min-w-[150px]">
                        Motivo Principal
                      </th>
                      <th className="py-3.5 px-4 min-w-[140px]">Nº Reportes</th>
                      <th className="py-3.5 px-4 min-w-[110px]">
                        Primer Reporte
                      </th>
                      <th className="py-3.5 px-4 min-w-[120px]">Estado</th>
                      <th className="py-3.5 px-4 text-right min-w-[120px]">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-low">
                    {/* ROW 1: SUPER CRÍTICA (>3 REPORTES) - RED HIGHLIGHT & PINK BG */}
                    <tr className="bg-error-container/35 hover:bg-error-container/50 transition-colors shadow-[inset_4px_0_0_0] shadow-error">
                      <td className="py-4 px-4 text-center align-top">
                        <input
                          checked={selectedRows.has(1)}
                          onChange={() => handleToggleRow(1)}
                          className="row-checkbox w-4 h-4 rounded text-error accent-error cursor-pointer mt-1"
                          type="checkbox"
                        />
                      </td>
                      <td className="py-4 px-3 align-top">
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-surface-container-high shadow-sm group cursor-pointer flex-shrink-0">
                          <img
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            data-alt="Close up photograph of a suspicious dark high tech smartwatch inside an open glossy packaging box with fake branding labels, clean retail lighting, high resolution product shot"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7w_78ZiXxHA1_G73um0kYaAFzwq8iEX2J8rV-fH3u5H7--gSD5ukVflUSrw8ZpdDreFegzTuVtE6DUMLVxnvYKIeeCYnqJiIO98gxd_5YCkpZwH650rI-aOA8WJbSiC2uUSuYsLtUSlsSXgRYaXSwqbpm1Fr4RyHxi6nMt9kxlLRPuN44e5J0OJNah92XTmkZZXMn4KApznRhSEsMTi4nA-lYb2wG-rotHCBKeDeGlBKKhU0aHwK_"
                          />
                          <span
                            className="absolute bottom-0.5 right-0.5 bg-error text-on-error p-0.5 rounded text-[10px] leading-none flex items-center"
                            title="Contenido marcado con alto riesgo"
                          >
                            <span className="material-symbols-outlined text-[12px]">
                              warning
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="px-2 py-0.5 rounded-full bg-error text-on-error font-label-sm text-label-sm font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">
                                dangerous
                              </span>
                              Alerta Crítica (&gt;3)
                            </span>
                            <span className="font-caption text-caption text-on-surface-variant">
                              ID: #REP-89410
                            </span>
                          </div>
                          <p className="font-body-md text-body-md text-on-surface font-medium leading-snug">
                            "Gran liquidación por cierre! iPhone 15 Pro Max a
                            solo S/ 500 soles transferencia inmediata al wsp..."
                          </p>
                          <div className="flex items-center gap-2 mt-2 font-caption text-caption text-on-surface-variant">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">
                                storefront
                              </span>{" "}
                              Marketplace Item
                            </span>
                            <span>•</span>
                            <span>Enlace externo a WhatsApp detectado</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-body-md-medium text-body-md-medium text-on-surface">
                              Pedro Mendoza
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm">
                              Usuario Persona
                            </span>
                          </div>
                          <span className="font-caption text-caption text-error font-medium mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">
                              schedule
                            </span>{" "}
                            Antigüedad: 2 días
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-error text-on-error font-label-sm text-label-sm font-semibold">
                          <span className="material-symbols-outlined text-[14px]">
                            report
                          </span>
                          Posible Estafa / Fraude
                        </span>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-error text-on-error font-label-sm text-label-sm font-bold shadow-sm">
                            <span className="material-symbols-outlined text-[14px]">
                              notifications_active
                            </span>
                            5 reportes
                          </span>
                          <span className="font-caption text-caption text-on-surface-variant">
                            Spam x3, Estafa x2
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <span className="font-body-md text-body-md text-on-surface font-medium whitespace-nowrap">
                          Hoy, 09:20
                        </span>
                        <span className="block font-caption text-caption text-error mt-0.5">
                          Hace 45 min
                        </span>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-error text-on-error font-label-sm text-label-sm font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-on-error"></span>
                          Abierto
                        </span>
                      </td>
                      <td className="py-4 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            className="px-space-md py-1.5 rounded-lg bg-error hover:bg-on-error-container text-on-error font-label-md text-label-md font-semibold transition-colors flex items-center gap-1 shadow-sm"
                            href="/admin"
                          >
                            <span>Revisar (A7)</span>
                            <span className="material-symbols-outlined text-[16px]">
                              arrow_forward
                            </span>
                          </a>
                          <button
                            className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"
                            title="Acciones Rápidas"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              more_vert
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* ROW 2: CRÍTICA (4 REPORTES) - RED HIGHLIGHT & PINK BG */}
                    <tr className="bg-error-container/25 hover:bg-error-container/40 transition-colors shadow-[inset_4px_0_0_0] shadow-error">
                      <td className="py-4 px-4 text-center align-top">
                        <input
                          checked={selectedRows.has(2)}
                          onChange={() => handleToggleRow(2)}
                          className="row-checkbox w-4 h-4 rounded text-error accent-error cursor-pointer mt-1"
                          type="checkbox"
                        />
                      </td>
                      <td className="py-4 px-3 align-top">
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-surface-container-high shadow-sm group cursor-pointer flex-shrink-0">
                          <img
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            data-alt="Digital graphic banner promising high daily income with cash symbols and suspicious referral arrows on vibrant saturated gradients, promotional web spam design style"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBpZ5ZISPzAuPAq0tGbLbsHBVML0UJbaGmNjwUhECy-c6jVfYsGlZ9czXBKhOWIa8_hKqT9V5uJu9g3YRfxMGQ7Pt06UX5GueJMa3eWbE_xHr_ZnHsmNtZSj8CrF1CN0V0wiUuPP9XKlEWA5vEHWEinS7KtJAixIoZHNTG0Fip6cTIBQrYeZURPJTT3rFdCOSbeotP7pMPMtbKjqfvn3aO0AH573_KaB2kIenZG992wmPcwfXqYlk1F"
                          />
                          <span
                            className="absolute bottom-0.5 right-0.5 bg-tertiary-container text-on-tertiary-container p-0.5 rounded text-[10px] leading-none flex items-center"
                            title="Post con links externos"
                          >
                            <span className="material-symbols-outlined text-[12px]">
                              link
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">
                                priority_high
                              </span>
                              Crítico (&gt;3)
                            </span>
                            <span className="font-caption text-caption text-on-surface-variant">
                              ID: #REP-89404
                            </span>
                          </div>
                          <p className="font-body-md text-body-md text-on-surface font-medium leading-snug">
                            "Gana S/ 2000 diarios trabajando desde casa solo
                            reenvía este link a tus grupos sin requisitos..."
                          </p>
                          <div className="flex items-center gap-2 mt-2 font-caption text-caption text-on-surface-variant">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">
                                dynamic_feed
                              </span>{" "}
                              Publicación en Feed Social
                            </span>
                            <span>•</span>
                            <span>Patrón de difusión en múltiples muros</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="flex flex-col">
                          <span className="font-body-md-medium text-body-md-medium text-on-surface">
                            Lucía Fernández
                          </span>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm">
                              Usuario Persona
                            </span>
                          </div>
                          <span className="font-caption text-caption text-on-surface-variant mt-1">
                            Antigüedad: 4 meses
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-semibold">
                          <span className="material-symbols-outlined text-[14px]">
                            forward
                          </span>
                          Spam repetitivo
                        </span>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-error text-on-error font-label-sm text-label-sm font-bold shadow-sm">
                            <span className="material-symbols-outlined text-[14px]">
                              campaign
                            </span>
                            4 reportes
                          </span>
                          <span className="font-caption text-caption text-on-surface-variant">
                            Spam x4
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <span className="font-body-md text-body-md text-on-surface font-medium whitespace-nowrap">
                          Hoy, 10:15
                        </span>
                        <span className="block font-caption text-caption text-outline mt-0.5">
                          Hace 1h 05m
                        </span>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                            En revisión
                          </span>
                          <span className="font-caption text-caption text-on-surface-variant flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px] text-primary">
                              person
                            </span>{" "}
                            admin02
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button className="px-space-md py-1.5 rounded-lg bg-primary hover:bg-on-secondary-fixed-variant text-on-primary font-label-md text-label-md font-semibold transition-colors flex items-center gap-1 shadow-sm">
                            <span>Revisar</span>
                            <span className="material-symbols-outlined text-[16px]">
                              visibility
                            </span>
                          </button>
                          <button
                            className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"
                            title="Acciones Rápidas"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              more_vert
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* ROW 3: REGULAR (2 REPORTES) */}
                    <tr className="hover:bg-surface-container-low transition-colors">
                      <td className="py-4 px-4 text-center align-top">
                        <input
                          checked={selectedRows.has(3)}
                          onChange={() => handleToggleRow(3)}
                          className="row-checkbox w-4 h-4 rounded text-primary accent-primary cursor-pointer mt-1"
                          type="checkbox"
                        />
                      </td>
                      <td className="py-4 px-3 align-top">
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-surface-container-high shadow-sm group cursor-pointer flex-shrink-0">
                          <img
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            data-alt="Editorial studio photo of replica athletic running shoes on a clean concrete floor, side angle presentation with dramatic low lighting, crisp commercial footwear photograph"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDZQgUvnxU0RhiefXzhFnxGO64yMeIy9KCNrgE94evkNL0sg3KH0FOycbL4R0fdmzr7eqOIO6jMM__dKq_Uzwz2kMh_ue8pDbiTbT1_pcTrjkCMVWIsDCf7Ly1TdYrBfEJzUrIto3capxCe0njoO_rU1GbqiIIc7C1mq_L3j91w8iOL1PiO01NOt4K28Ucc99CV_Cqrjfg3W43PCxw4BXT4jdM4iB4xRMO3o4G8LR1RSGVUoWtHcH1N"
                          />
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="flex flex-col">
                          <span className="font-caption text-caption text-on-surface-variant mb-0.5">
                            ID: #REP-89388
                          </span>
                          <p className="font-body-md text-body-md text-on-surface leading-snug">
                            "Zapatillas deportivas importadas 100% originales
                            precio negociable..."
                          </p>
                          <div className="flex items-center gap-2 mt-2 font-caption text-caption text-on-surface-variant">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">
                                sell
                              </span>{" "}
                              Producto Catálogo
                            </span>
                            <span>•</span>
                            <span>Sin número de serie verificado</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className="font-body-md-medium text-body-md-medium text-on-surface">
                              Urban Sneaker Lima
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-medium">
                              Negocio no verificado
                            </span>
                          </div>
                          <span className="font-caption text-caption text-on-surface-variant mt-1">
                            Antigüedad: 1 año
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-medium">
                          <span className="material-symbols-outlined text-[14px]">
                            branding_watermark
                          </span>
                          Producto falsificado
                        </span>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold">
                            2 reportes
                          </span>
                          <span className="font-caption text-caption text-outline">
                            Posible imitación
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <span className="font-body-md text-body-md text-on-surface whitespace-nowrap">
                          Ayer, 18:30
                        </span>
                        <span className="block font-caption text-caption text-outline mt-0.5">
                          Hace 16h
                        </span>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                          Abierto
                        </span>
                      </td>
                      <td className="py-4 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button className="px-space-md py-1.5 rounded-lg bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface font-label-md text-label-md font-semibold transition-colors flex items-center gap-1">
                            <span>Revisar</span>
                            <span className="material-symbols-outlined text-[16px]">
                              visibility
                            </span>
                          </button>
                          <button
                            className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"
                            title="Acciones Rápidas"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              more_vert
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* ROW 4: RESUELTO (1 REPORTE) */}
                    <tr className="hover:bg-surface-container-low transition-colors opacity-80">
                      <td className="py-4 px-4 text-center align-top">
                        <input
                          checked={selectedRows.has(4)}
                          onChange={() => handleToggleRow(4)}
                          className="row-checkbox w-4 h-4 rounded text-primary accent-primary cursor-pointer mt-1"
                          type="checkbox"
                        />
                      </td>
                      <td className="py-4 px-3 align-top">
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-surface-container-high shadow-sm flex items-center justify-center flex-shrink-0 text-on-surface-variant">
                          <span className="material-symbols-outlined text-[24px]">
                            chat_bubble_outline
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="flex flex-col">
                          <span className="font-caption text-caption text-outline mb-0.5">
                            ID: #REP-89352
                          </span>
                          <p className="font-body-md text-body-md text-on-surface-variant leading-snug italic">
                            "Este vendedor no contesta y es una pésima tienda no
                            les compren estafadores..."
                          </p>
                          <div className="flex items-center gap-2 mt-2 font-caption text-caption text-outline">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">
                                reply
                              </span>{" "}
                              Comentario en tienda
                            </span>
                            <span>•</span>
                            <span>Evaluación negativa de comprador</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="flex flex-col">
                          <span className="font-body-md-medium text-body-md-medium text-on-surface">
                            Jorge Rivas
                          </span>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                              Usuario Persona
                            </span>
                          </div>
                          <span className="font-caption text-caption text-outline mt-1">
                            Antigüedad: 2 años
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-medium">
                          <span className="material-symbols-outlined text-[14px]">
                            flag
                          </span>
                          Acoso o difamación
                        </span>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                            1 reporte
                          </span>
                          <span className="font-caption text-caption text-outline">
                            Difamación x1
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <span className="font-body-md text-body-md text-on-surface-variant whitespace-nowrap">
                          Ayer, 14:10
                        </span>
                        <span className="block font-caption text-caption text-outline mt-0.5">
                          Hace 20h
                        </span>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-medium">
                            <span className="material-symbols-outlined text-[13px]">
                              check_circle
                            </span>
                            Resuelto
                          </span>
                          <span className="font-caption text-caption text-outline">
                            Descartado: reclamo comercial
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button className="px-space-md py-1.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors flex items-center gap-1">
                            <span>Ver resolución</span>
                            <span className="material-symbols-outlined text-[16px]">
                              info
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* Pagination & SLA Commitment Footer */}
              <div className="px-space-lg py-space-md bg-surface-container-lowest flex flex-col md:flex-row items-center justify-between gap-space-md">
                <div className="flex items-center gap-space-md text-on-surface-variant font-body-md text-body-md">
                  <span>
                    Mostrando{" "}
                    <strong className="text-on-surface font-semibold">
                      1-4
                    </strong>{" "}
                    de{" "}
                    <strong className="text-on-surface font-semibold">
                      18
                    </strong>{" "}
                    elementos reportados
                  </span>
                  <span className="hidden sm:inline text-outline">•</span>
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm">
                    <span className="material-symbols-outlined text-primary text-[15px]">
                      verified_user
                    </span>
                    <span>
                      SLA institucional: resolución &lt; 2 horas garantizada
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-space-sm">
                  <button
                    className="w-9 h-9 rounded-lg bg-surface-container-low text-outline flex items-center justify-center cursor-not-allowed"
                    disabled={true}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      chevron_left
                    </span>
                  </button>
                  <button className="w-9 h-9 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold flex items-center justify-center">
                    1
                  </button>
                  <button className="w-9 h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center justify-center transition-colors">
                    2
                  </button>
                  <button className="w-9 h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center justify-center transition-colors">
                    3
                  </button>
                  <button className="w-9 h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-[18px]">
                      chevron_right
                    </span>
                  </button>
                </div>
              </div>
            </div>
            {/* Operational Protocol Legend Callout */}
            <div className="bg-surface-container-low rounded-xl p-space-lg shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
              <div className="flex items-start gap-space-md">
                <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[20px]">
                    policy
                  </span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">
                    Criterio de Intervención Prioritaria
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
                    Cualquier publicación o producto con más de 3 denuncias
                    concurrentes se bloquea de indexación pública
                    automáticamente y entra en cola roja reforzada. Los casos de
                    suplantación bancaria o venta fraudulenta tienen
                    escalamiento directo al Oficial de Cumplimiento.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-space-sm self-end md:self-auto flex-shrink-0">
                <a
                  className="px-space-md py-2 rounded-lg bg-surface-container-lowest text-primary font-label-md text-label-md font-semibold hover:bg-surface-container-high transition-colors flex items-center gap-1.5 shadow-sm"
                  href="/admin"
                >
                  <span>Ver Log de Auditoría</span>
                  <span className="material-symbols-outlined text-[16px]">
                    arrow_outward
                  </span>
                </a>
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
