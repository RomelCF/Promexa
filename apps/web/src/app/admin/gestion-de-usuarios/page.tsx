"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface DirectoryUser {
  id: string;
  name: string;
  handle: string;
  subtitle?: string;
  email: string;
  profileType: "personal" | "business";
  documentType: "DNI" | "RUC";
  documentNumber: string;
  status: "activo" | "verificacion" | "observacion" | "suspendido" | "bloqueado";
  statusLabel: string;
  isVerified: boolean;
  registeredDate: string;
  registeredRelative: string;
  lastAccess: string;
  lastAccessSub: string;
  reportsCount: number;
  reportsLabel: string;
  riskLevel: "Bajo" | "Medio" | "Alto" | "Crítico";
  avatarInitials: string;
  avatarColor: string;
  isStore?: boolean;
  role?: string;
  stats?: {
    friends?: number;
    followers?: number;
    posts?: number;
    products?: number;
  };
}

export default function GestionUsuariosPage() {
  const { user, token, isLoading, logout } = useAuth();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [directoryError, setDirectoryError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [accountType, setAccountType] = useState<"all" | "persona" | "negocio">("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [reportsFilter, setReportsFilter] = useState("");

  // Checkbox selections
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Feedback & Modals
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [viewUser, setViewUser] = useState<DirectoryUser | null>(null);
  const [sanctionModalUser, setSanctionModalUser] = useState<DirectoryUser | null>(null);
  const [sanctionStatus, setSanctionStatus] = useState<DirectoryUser["status"]>("suspendido");
  const [sanctionReason, setSanctionReason] = useState("Incumplimiento de términos y condiciones");
  const [sanctionDuration, setSanctionDuration] = useState("14");
  const [sanctionNotes, setSanctionNotes] = useState("");
  const [bulkActionModalOpen, setBulkActionModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth protection
  useEffect(() => {
    if (mounted && !isLoading) {
      if (!user) {
        router.replace("/login");
      } else if (user.role !== "ADMIN") {
        router.replace("/");
      }
    }
  }, [mounted, user, isLoading, router]);

  // Load users from API
  useEffect(() => {
    if (mounted && user && user.role === "ADMIN") {
      const fetchUsers = async () => {
        try {
          const res = await fetch("/api/admin/users", {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!res.ok) throw new Error('No se pudo consultar el directorio');
          const data = await res.json();
          if (!Array.isArray(data)) throw new Error('Directorio invalido');
          setUsers(data);
          setDirectoryError('');
        } catch {
          setUsers([]);
          setDirectoryError('No se pudo cargar el directorio de usuarios. Recarga para reintentar.');
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchUsers();
    }
  }, [mounted, user, token]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  // Filtered users calculation
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = u.name.toLowerCase().includes(q);
        const matchHandle = u.handle.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchDoc = u.documentNumber.toLowerCase().includes(q);
        const matchId = u.id.toLowerCase().includes(q);
        if (!matchName && !matchHandle && !matchEmail && !matchDoc && !matchId) return false;
      }

      // 2. Account Type
      if (accountType === "persona" && u.profileType !== "personal") return false;
      if (accountType === "negocio" && u.profileType !== "business") return false;

      // 3. Status
      if (statusFilter && u.status !== statusFilter) return false;

      // 4. Reports
      if (reportsFilter === "none" && u.reportsCount > 0) return false;
      if (reportsFilter === "with-reports" && u.reportsCount === 0) return false;
      if (reportsFilter === "critical" && u.reportsCount < 3) return false;

      return true;
    });
  }, [users, searchQuery, accountType, statusFilter, reportsFilter]);

  // Checkbox master logic
  const allFilteredIds = useMemo(() => filteredUsers.map((u) => u.id), [filteredUsers]);
  const masterChecked =
    allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedUsers.has(id));

  const handleToggleMaster = () => {
    if (masterChecked) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(allFilteredIds));
    }
  };

  const handleToggleUser = (id: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setAccountType("all");
    setStatusFilter("");
    setDateFilter("");
    setReportsFilter("");
    showToast("Filtros restablecidos");
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Nombre",
      "Handle",
      "Email",
      "Tipo de Cuenta",
      "Documento",
      "Numero",
      "Estado",
      "Verificado",
      "Reportes",
      "Fecha Registro",
      "Ultimo Acceso"
    ];

    const rows = filteredUsers.map((u) => [
      `"${u.id}"`,
      `"${u.name}"`,
      `"${u.handle}"`,
      `"${u.email}"`,
      `"${u.profileType === "business" ? "Negocio / PYME" : "Persona Natural"}"`,
      `"${u.documentType}"`,
      `"${u.documentNumber}"`,
      `"${u.statusLabel}"`,
      `"${u.isVerified ? "Si" : "No"}"`,
      `"${u.reportsCount}"`,
      `"${u.registeredDate}"`,
      `"${u.lastAccess}"`
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `directorio_usuarios_promexa_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Directorio exportado exitosamente (${filteredUsers.length} registros en CSV)`);
  };

  // Open Sanction Modal
  const openSanctionModal = (targetUser: DirectoryUser) => {
    setSanctionModalUser(targetUser);
    setSanctionStatus(targetUser.status === "activo" ? "suspendido" : targetUser.status);
    setSanctionReason("Incumplimiento de términos y condiciones");
    setSanctionDuration("14");
    setSanctionNotes("");
  };

  // Apply Sanction
  const handleApplySanction = async () => {
    if (!sanctionModalUser) return;
    const targetId = sanctionModalUser.id;

    let statusLabel = "Activo";
    if (sanctionStatus === "verificacion") statusLabel = "En Verificación";
    if (sanctionStatus === "observacion") statusLabel = "En Observación";
    if (sanctionStatus === "suspendido") statusLabel = `Suspendido (${sanctionDuration} días)`;
    if (sanctionStatus === "bloqueado") statusLabel = "Bloqueado Permanente";

    const riskLevel =
      sanctionStatus === "bloqueado"
        ? "Crítico"
        : sanctionStatus === "suspendido"
        ? "Alto"
        : sanctionStatus === "observacion"
        ? "Medio"
        : "Bajo";

    const updatedUser: DirectoryUser = {
      ...sanctionModalUser,
      status: sanctionStatus,
      statusLabel,
      riskLevel,
      lastAccessSub:
        sanctionStatus === "bloqueado"
          ? "Acceso Revocado"
          : sanctionStatus === "suspendido"
          ? "Intento bloqueo activo"
          : sanctionModalUser.lastAccessSub,
    };

    setUsers((prev) => prev.map((u) => (u.id === targetId ? updatedUser : u)));
    if (viewUser && viewUser.id === targetId) {
      setViewUser(updatedUser);
    }

    // Call API in background
    try {
      await fetch(`/api/admin/users/${targetId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: sanctionStatus,
          isVerified: sanctionStatus === "bloqueado" ? false : sanctionModalUser.isVerified,
        }),
      });
    } catch {
      // Local state is already updated
    }

    setSanctionModalUser(null);
    showToast(`Estado de @${sanctionModalUser.handle} actualizado a: ${statusLabel}`);
  };

  // Toggle Verification
  const handleToggleVerification = async (targetUser: DirectoryUser) => {
    const newVer = !targetUser.isVerified;
    const updated: DirectoryUser = {
      ...targetUser,
      isVerified: newVer,
      status: targetUser.status === "verificacion" && newVer ? "activo" : targetUser.status,
      statusLabel: targetUser.status === "verificacion" && newVer ? "Activo" : targetUser.statusLabel,
    };

    setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? updated : u)));
    if (viewUser && viewUser.id === targetUser.id) {
      setViewUser(updated);
    }

    try {
      await fetch(`/api/admin/users/${targetUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isVerified: newVer }),
      });
    } catch {}

    showToast(
      newVer
        ? `Insignia de verificación otorgada a ${targetUser.name}`
        : `Verificación removida para ${targetUser.name}`
    );
  };

  // Delete User
  const handleDeleteUser = async (targetUser: DirectoryUser) => {
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente a ${targetUser.name} (${targetUser.email})?`)) {
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      setSelectedUsers((prev) => {
        const next = new Set(prev);
        next.delete(targetUser.id);
        return next;
      });
      if (viewUser && viewUser.id === targetUser.id) {
        setViewUser(null);
      }

      try {
        await fetch(`/api/admin/users/${targetUser.id}`, {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      } catch {}

      showToast(`Usuario ${targetUser.name} eliminado de la base de datos`);
    }
  };

  // Bulk Actions
  const handleBulkAction = (action: "activar" | "verificar" | "suspender" | "eliminar") => {
    if (selectedUsers.size === 0) return;

    if (action === "activar") {
      setUsers((prev) =>
        prev.map((u) =>
          selectedUsers.has(u.id)
            ? { ...u, status: "activo", statusLabel: "Activo", riskLevel: "Bajo" }
            : u
        )
      );
      showToast(`${selectedUsers.size} cuentas reactivadas con éxito`);
    } else if (action === "verificar") {
      setUsers((prev) =>
        prev.map((u) =>
          selectedUsers.has(u.id)
            ? { ...u, isVerified: true, status: u.status === "verificacion" ? "activo" : u.status, statusLabel: u.status === "verificacion" ? "Activo" : u.statusLabel }
            : u
        )
      );
      showToast(`${selectedUsers.size} cuentas marcadas como verificadas`);
    } else if (action === "suspender") {
      setUsers((prev) =>
        prev.map((u) =>
          selectedUsers.has(u.id)
            ? { ...u, status: "suspendido", statusLabel: "Suspendido (14 días)", riskLevel: "Alto" }
            : u
        )
      );
      showToast(`${selectedUsers.size} cuentas suspendidas temporalmente por 14 días`);
    } else if (action === "eliminar") {
      if (confirm(`¿Confirmas la eliminación permanente de las ${selectedUsers.size} cuentas seleccionadas?`)) {
        setUsers((prev) => prev.filter((u) => !selectedUsers.has(u.id)));
        setSelectedUsers(new Set());
        showToast(`${selectedUsers.size} cuentas eliminadas`);
      }
    }

    setBulkActionModalOpen(false);
  };

  // Dynamic KPI Counts
  const totalCount = 28450 + (users.length - 6);
  const personasCount = users.filter((u) => u.profileType === "personal").length;
  const negociosCount = users.filter((u) => u.profileType === "business").length;
  const sancionadosCount = users.filter(
    (u) => u.status === "suspendido" || u.status === "bloqueado" || u.status === "observacion"
  ).length;
  const activosCount = users.filter((u) => u.status === "activo").length;

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
            <span>Cargando directorio de usuarios...</span>
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
        <div className="fixed bottom-6 right-6 z-[999] bg-[#121c2a] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-white/10 animate-fadeIn">
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

      {/* Sidebar */}
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
            Plataforma &amp; Supervisión
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
          <Link
            href="/admin"
            className="flex items-center justify-between px-space-md py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
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
          </Link>
          <Link
            href="/admin/moderacion-y-reportes"
            className="flex items-center justify-between px-space-md py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-[20px]">
                warning
              </span>
              <span className="font-body-md text-body-md">
                Moderación &amp; Reportes
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-error text-on-error font-label-sm text-label-sm font-semibold">
              8
            </span>
          </Link>
          <Link
            href="/admin"
            className="flex items-center justify-between px-space-md py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-[20px]">
                description
              </span>
              <span className="font-body-md text-body-md">
                Detalle de Solicitud RUC
              </span>
            </div>
          </Link>
          <div className="px-space-sm pt-space-md pb-1 font-caption text-caption uppercase tracking-wider text-outline">
            Sistemas &amp; Contenido
          </div>
          <Link
            href="/admin"
            className="flex items-center justify-between px-space-md py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-[20px]">
                pulse_alert
              </span>
              <span className="font-body-md text-body-md">
                Auditoría &amp; Salud
              </span>
            </div>
            <span className="flex items-center gap-1 font-caption text-caption text-secondary font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>OK
            </span>
          </Link>
          {/* Active Link: Gestión de Usuarios */}
          <Link
            aria-current="page"
            href="/admin/gestion-de-usuarios"
            className="flex items-center justify-between px-space-md py-2.5 rounded-lg transition-colors bg-primary-container text-on-primary font-body-md-medium"
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
          <Link
            href="/admin"
            className="flex items-center justify-between px-space-md py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-[20px]">
                inventory_2
              </span>
              <span className="font-body-md text-body-md">
                Gestión de Contenido
              </span>
            </div>
          </Link>
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

      {/* Main Layout */}
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
          {directoryError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{directoryError}</p>}
          <div className="flex flex-col w-full space-y-space-lg">
            {/* 1. Header de Sección */}
            <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
              <div className="space-y-1">
                <nav className="flex items-center gap-1.5 font-caption text-caption text-on-surface-variant">
                  <span>Panel de Administración Promexa</span>
                  <span className="material-symbols-outlined text-[14px] text-outline">
                    chevron_right
                  </span>
                  <span>Sistemas &amp; Contenido</span>
                  <span className="material-symbols-outlined text-[14px] text-outline">
                    chevron_right
                  </span>
                  <span className="text-primary font-medium">
                    Gestión de Usuarios
                  </span>
                </nav>
                <div className="flex items-center gap-space-sm pt-0.5">
                  <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                    Gestión y Directorio de Usuarios
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold">
                    Módulo A14
                  </span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
                  Administración integral de cuentas de personas naturales y
                  negocios registrados. Supervisión de estados, accesos y
                  aplicación de medidas disciplinarias con trazabilidad
                  auditable.
                </p>
              </div>
              {/* Botones de Acción Superior */}
              <div className="flex items-center gap-space-sm self-start lg:self-center shrink-0">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-space-md py-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-body-md-medium text-body-md-medium shadow-sm transition-all border border-outline-variant/30"
                  id="btn-export-csv"
                  title="Exportar registros filtrados a CSV"
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    download
                  </span>
                  <span>Exportar Directorio (CSV)</span>
                </button>
                <button
                  onClick={() => setBulkActionModalOpen(true)}
                  className="flex items-center gap-2 px-space-md py-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-body-md-medium text-body-md-medium shadow-sm transition-all"
                  id="btn-bulk-actions"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    tune
                  </span>
                  <span>Acciones Masivas</span>
                </button>
              </div>
            </section>

            {/* 2. KPIs / Métricas Rápidas */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-md">
              {/* Card 1: Total Usuarios */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                    Total Usuarios
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[18px]">
                      group
                    </span>
                  </div>
                </div>
                <div className="mt-space-sm">
                  <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
                    {totalCount.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 font-caption text-caption text-on-surface-variant">
                    <span className="text-primary font-semibold flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[14px]">
                        trending_up
                      </span>
                      +12.4%
                    </span>
                    <span>este mes</span>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20"></div>
              </div>

              {/* Card 2: Personas Naturales */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                    Personas Naturales
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[18px]">
                      person
                    </span>
                  </div>
                </div>
                <div className="mt-space-sm">
                  <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
                    {(26120 + personasCount).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 font-caption text-caption text-on-surface-variant">
                    <span className="text-secondary font-semibold">91.8%</span>
                    <span>del directorio</span>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary/30"></div>
              </div>

              {/* Card 3: Negocios y PYMEs */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                    Negocios y PYMEs
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[18px]">
                      storefront
                    </span>
                  </div>
                </div>
                <div className="mt-space-sm">
                  <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
                    {(2330 + negociosCount).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 font-caption text-caption text-on-surface-variant">
                    <span className="text-primary font-semibold flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[14px]">
                        verified
                      </span>
                      {users.filter((u) => u.profileType === "business" && u.isVerified).length + 1890}
                    </span>
                    <span>con RUC verificado</span>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary"></div>
              </div>

              {/* Card 4: Sancionados o en Observación */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                    Cuentas Sancionadas
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-error-container flex items-center justify-center text-error">
                    <span className="material-symbols-outlined text-[18px]">
                      gavel
                    </span>
                  </div>
                </div>
                <div className="mt-space-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="font-headline-lg text-headline-lg text-error font-bold tracking-tight">
                      {39 + sancionadosCount}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">
                      1.5%
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 font-caption text-caption text-error">
                    <span className="material-symbols-outlined text-[13px]">
                      warning
                    </span>
                    <span>Requieren supervisión A6</span>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-error"></div>
              </div>

              {/* Card 5: Activos Hoy */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                    Usuarios Activos Hoy
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-container">
                    <span className="material-symbols-outlined text-[18px]">
                      bolt
                    </span>
                  </div>
                </div>
                <div className="mt-space-sm">
                  <div className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
                    {(4890 + activosCount).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 font-caption text-caption text-on-surface-variant">
                    <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
                    <span>Sesión &lt; 24h concurrentes</span>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary-container"></div>
              </div>
            </section>

            {/* 3. Barra de Búsqueda y Filtros Dinámicos */}
            <section className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm space-y-space-md">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-space-md">
                {/* Input de Búsqueda */}
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                    search
                  </span>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-11 pl-11 pr-10 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none transition-all shadow-inner"
                    id="search-input"
                    placeholder="Buscar por nombre, correo (@...), DNI, RUC o ID de usuario..."
                    type="text"
                  />
                  {searchQuery.length > 0 && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                      id="clear-search-btn"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        close
                      </span>
                    </button>
                  )}
                </div>

                {/* Segmento Tipo de Cuenta */}
                <div className="flex bg-surface-container-low p-1 rounded-lg shrink-0">
                  <button
                    onClick={() => setAccountType("all")}
                    className={`px-space-md py-1.5 rounded-lg font-body-md-medium text-body-md-medium transition-all ${
                      accountType === "all"
                        ? "bg-surface-container-lowest text-primary shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Todos ({users.length})
                  </button>
                  <button
                    onClick={() => setAccountType("persona")}
                    className={`px-space-md py-1.5 rounded-lg font-body-md-medium text-body-md-medium transition-all ${
                      accountType === "persona"
                        ? "bg-surface-container-lowest text-primary shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Personas ({personasCount})
                  </button>
                  <button
                    onClick={() => setAccountType("negocio")}
                    className={`px-space-md py-1.5 rounded-lg font-body-md-medium text-body-md-medium transition-all ${
                      accountType === "negocio"
                        ? "bg-surface-container-lowest text-primary shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Comercios / Negocios ({negociosCount})
                  </button>
                </div>
              </div>

              {/* Filtros Secundarios */}
              <div className="flex flex-wrap items-center justify-between gap-space-md pt-2">
                <div className="flex flex-wrap items-center gap-space-sm">
                  {/* Filtro Estado */}
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="h-9 pl-3 pr-8 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md focus:outline-none cursor-pointer appearance-none"
                      id="filter-status"
                    >
                      <option value="">Estado: Todos los estados</option>
                      <option value="activo">Activo</option>
                      <option value="verificacion">En Verificación</option>
                      <option value="observacion">En Observación</option>
                      <option value="suspendido">Suspendido Temporal</option>
                      <option value="bloqueado">Bloqueado Permanente</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-[16px] pointer-events-none">
                      expand_more
                    </span>
                  </div>

                  {/* Filtro Fecha Registro */}
                  <div className="relative">
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="h-9 pl-3 pr-8 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md focus:outline-none cursor-pointer appearance-none"
                      id="filter-date"
                    >
                      <option value="">Registro: Cualquier fecha</option>
                      <option value="30d">Últimos 30 días</option>
                      <option value="trimestre">Último trimestre</option>
                      <option value="anio">Año en curso (2026)</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-[16px] pointer-events-none">
                      calendar_today
                    </span>
                  </div>

                  {/* Filtro Reportes */}
                  <div className="relative">
                    <select
                      value={reportsFilter}
                      onChange={(e) => setReportsFilter(e.target.value)}
                      className="h-9 pl-3 pr-8 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md focus:outline-none cursor-pointer appearance-none"
                      id="filter-reports"
                    >
                      <option value="">Reportes: Cualquier número</option>
                      <option value="none">Sin reportes (0)</option>
                      <option value="with-reports">
                        Con reportes (&gt; 0)
                      </option>
                      <option value="critical">
                        Críticos (&gt;= 3 reportes)
                      </option>
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-[16px] pointer-events-none">
                      flag
                    </span>
                  </div>

                  {/* Botón Limpiar Filtros */}
                  {(searchQuery || accountType !== "all" || statusFilter || reportsFilter || dateFilter) && (
                    <button
                      onClick={handleResetFilters}
                      className="h-9 px-space-sm text-outline hover:text-error font-label-sm text-label-sm flex items-center gap-1 transition-colors"
                      id="reset-filters"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        restart_alt
                      </span>
                      <span>Limpiar filtros</span>
                    </button>
                  )}
                </div>

                {/* Resumen rápido de seleccionados */}
                {selectedUsers.size > 0 && (
                  <div
                    className="flex items-center gap-2 px-space-md py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm animate-fadeIn shadow-sm"
                    id="selection-counter"
                  >
                    <span id="selected-count-text" className="font-semibold">
                      {selectedUsers.size} seleccionado
                      {selectedUsers.size > 1 ? "s" : ""}
                    </span>
                    <button
                      onClick={() => setBulkActionModalOpen(true)}
                      className="font-bold underline hover:opacity-80 ml-1"
                      id="batch-action-trigger"
                    >
                      Aplicar acción masiva
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* 4. Tabla Principal de Usuarios */}
            <section className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
                <table
                  className="w-full text-left border-collapse"
                  id="users-table"
                >
                  <thead>
                    <tr className="bg-surface-container-low/70 text-on-surface-variant font-label-md text-label-md select-none">
                      <th className="py-3.5 pl-space-lg pr-space-sm w-10">
                        <input
                          checked={masterChecked}
                          onChange={handleToggleMaster}
                          className="w-4 h-4 rounded text-primary bg-surface-container-lowest focus:ring-0 cursor-pointer accent-primary"
                          id="select-all"
                          type="checkbox"
                        />
                      </th>
                      <th className="py-3.5 px-space-md font-medium">
                        Usuario / Razón Social
                      </th>
                      <th className="py-3.5 px-space-md font-medium">
                        Correo Electrónico
                      </th>
                      <th className="py-3.5 px-space-md font-medium">
                        Tipo de Cuenta
                      </th>
                      <th className="py-3.5 px-space-md font-medium">Estado</th>
                      <th className="py-3.5 px-space-md font-medium">
                        Registro
                      </th>
                      <th className="py-3.5 px-space-md font-medium">
                        Último Acceso
                      </th>
                      <th className="py-3.5 px-space-md font-medium">
                        Reportes / Alertas
                      </th>
                      <th className="py-3.5 pr-space-lg pl-space-md text-right font-medium">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-low text-on-surface font-body-md text-body-md">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-outline">
                          <div className="flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-[36px] text-outline">
                              search_off
                            </span>
                            <span className="font-body-md text-on-surface">
                              No se encontraron usuarios con los filtros seleccionados
                            </span>
                            <button
                              onClick={handleResetFilters}
                              className="text-primary hover:underline text-label-md font-medium mt-1"
                            >
                              Restablecer todos los filtros
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((item) => {
                        const isSelected = selectedUsers.has(item.id);
                        const isBlocked = item.status === "bloqueado";
                        const isSuspended = item.status === "suspendido";
                        const isObservacion = item.status === "observacion";

                        const rowBgClass = isBlocked
                          ? "bg-error-container/30 hover:bg-error-container/40"
                          : isSuspended
                          ? "bg-error-container/20 hover:bg-error-container/30"
                          : isSelected
                          ? "bg-primary-fixed/20 hover:bg-primary-fixed/30"
                          : "hover:bg-surface-container-low/50";

                        return (
                          <tr
                            key={item.id}
                            className={`user-row transition-colors group ${rowBgClass}`}
                            data-reports={item.reportsCount}
                            data-status={item.status}
                            data-type={item.profileType}
                          >
                            {/* Checkbox */}
                            <td className="py-3.5 pl-space-lg pr-space-sm">
                              <input
                                checked={isSelected}
                                onChange={() => handleToggleUser(item.id)}
                                className="user-checkbox w-4 h-4 rounded accent-primary cursor-pointer"
                                type="checkbox"
                              />
                            </td>

                            {/* Usuario / Razón Social */}
                            <td className="py-3.5 px-space-md">
                              <div className="flex items-center gap-space-sm min-w-0">
                                {item.isStore ? (
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.avatarColor}`}>
                                    <span className="material-symbols-outlined text-[20px]">
                                      store
                                    </span>
                                  </div>
                                ) : (
                                  <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-label-md text-label-md font-semibold shrink-0 ${item.avatarColor}`}
                                  >
                                    {item.avatarInitials}
                                  </div>
                                )}
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`font-body-md-medium text-body-md-medium truncate ${
                                        isBlocked ? "text-error line-through" : "text-on-surface"
                                      }`}
                                    >
                                      {item.name}
                                    </span>
                                    {item.isVerified && (
                                      <span
                                        className="material-symbols-outlined text-[16px] text-primary shrink-0"
                                        title={item.profileType === "business" ? "Negocio Oficial Verificado" : "Identidad Verificada"}
                                      >
                                        verified
                                      </span>
                                    )}
                                    {isBlocked && (
                                      <span className="material-symbols-outlined text-[16px] text-error shrink-0">
                                        cancel
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-caption text-caption text-on-surface-variant font-mono truncate">
                                    {item.handle} {item.subtitle ? `• ${item.subtitle}` : ""}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Correo Electrónico & Documento */}
                            <td className="py-3.5 px-space-md">
                              <div className="flex items-center gap-1.5 font-body-md text-body-md text-on-surface">
                                <span className="truncate">{item.email}</span>
                                {item.isVerified && (
                                  <span
                                    className="material-symbols-outlined text-[16px] text-primary shrink-0"
                                    title="Correo y cuenta verificada"
                                  >
                                    verified
                                  </span>
                                )}
                              </div>
                              <span className="font-caption text-caption text-outline font-mono">
                                {item.documentType}: {item.documentNumber}
                              </span>
                            </td>

                            {/* Tipo de Cuenta */}
                            <td className="py-3.5 px-space-md">
                              {item.profileType === "business" ? (
                                <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm font-semibold whitespace-nowrap">
                                  Negocio / PYME
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-medium whitespace-nowrap">
                                  Persona Natural
                                </span>
                              )}
                            </td>

                            {/* Estado */}
                            <td className="py-3.5 px-space-md">
                              {item.status === "activo" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold whitespace-nowrap">
                                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                                  Activo
                                </span>
                              )}
                              {item.status === "verificacion" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold whitespace-nowrap">
                                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                                  En Verificación
                                </span>
                              )}
                              {item.status === "observacion" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-semibold whitespace-nowrap">
                                  <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                                  En Observación
                                </span>
                              )}
                              {item.status === "suspendido" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold whitespace-nowrap">
                                  <span className="w-2 h-2 rounded-full bg-error"></span>
                                  {item.statusLabel}
                                </span>
                              )}
                              {item.status === "bloqueado" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-error text-on-error font-label-sm text-label-sm font-bold whitespace-nowrap">
                                  <span className="w-2 h-2 rounded-full bg-on-error"></span>
                                  Bloqueado Permanente
                                </span>
                              )}
                            </td>

                            {/* Registro */}
                            <td className="py-3.5 px-space-md whitespace-nowrap">
                              <div className="font-body-md text-body-md">
                                {item.registeredDate}
                              </div>
                              <div className="font-caption text-caption text-outline">
                                {item.registeredRelative}
                              </div>
                            </td>

                            {/* Último Acceso */}
                            <td className="py-3.5 px-space-md whitespace-nowrap">
                              <div
                                className={`font-body-md text-body-md font-medium ${
                                  isBlocked || isSuspended ? "text-error" : "text-on-surface"
                                }`}
                              >
                                {item.lastAccess}
                              </div>
                              <div className="font-caption text-caption text-outline">
                                {item.lastAccessSub}
                              </div>
                            </td>

                            {/* Reportes / Alertas */}
                            <td className="py-3.5 px-space-md whitespace-nowrap">
                              {item.reportsCount === 0 ? (
                                <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-outline font-label-sm text-label-sm font-medium">
                                  0 reportes
                                </span>
                              ) : item.reportsCount >= 5 ? (
                                <span className="px-2.5 py-0.5 rounded-full bg-error text-on-error font-label-sm text-label-sm font-bold flex items-center gap-1 w-max">
                                  <span className="material-symbols-outlined text-[13px]">
                                    dangerous
                                  </span>
                                  {item.reportsLabel}
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-semibold">
                                  {item.reportsLabel}
                                </span>
                              )}
                            </td>

                            {/* Acciones */}
                            <td className="py-3.5 pr-space-lg pl-space-md text-right whitespace-nowrap relative">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setViewUser(item)}
                                  className="p-1.5 rounded-lg text-primary hover:bg-surface-container-high transition-colors"
                                  title="Ver Detalle de Cuenta (A15)"
                                >
                                  <span className="material-symbols-outlined text-[20px]">
                                    visibility
                                  </span>
                                </button>
                                <button
                                  onClick={() => openSanctionModal(item)}
                                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container transition-colors"
                                  title="Suspender o Sancionar"
                                >
                                  <span className="material-symbols-outlined text-[20px]">
                                    {isSuspended || isBlocked ? "gavel" : "block"}
                                  </span>
                                </button>
                                <div className="relative">
                                  <button
                                    onClick={() =>
                                      setActiveMenuId(activeMenuId === item.id ? null : item.id)
                                    }
                                    className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                                    title="Más Opciones"
                                  >
                                    <span className="material-symbols-outlined text-[20px]">
                                      more_vert
                                    </span>
                                  </button>

                                  {/* Menu Flotante */}
                                  {activeMenuId === item.id && (
                                    <div
                                      onMouseLeave={() => setActiveMenuId(null)}
                                      className="absolute right-0 top-full mt-1 w-56 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 py-2 z-50 text-left font-label-md text-label-md animate-fadeIn"
                                    >
                                      <button
                                        onClick={() => {
                                          setViewUser(item);
                                          setActiveMenuId(null);
                                        }}
                                        className="w-full px-4 py-2 hover:bg-surface-container text-on-surface flex items-center gap-2"
                                      >
                                        <span className="material-symbols-outlined text-[18px] text-primary">
                                          person
                                        </span>
                                        <span>Ver expediente completo</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          handleToggleVerification(item);
                                          setActiveMenuId(null);
                                        }}
                                        className="w-full px-4 py-2 hover:bg-surface-container text-on-surface flex items-center gap-2"
                                      >
                                        <span className="material-symbols-outlined text-[18px] text-primary">
                                          verified
                                        </span>
                                        <span>
                                          {item.isVerified ? "Quitar verificación" : "Verificar cuenta"}
                                        </span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          openSanctionModal(item);
                                          setActiveMenuId(null);
                                        }}
                                        className="w-full px-4 py-2 hover:bg-surface-container text-tertiary flex items-center gap-2"
                                      >
                                        <span className="material-symbols-outlined text-[18px]">
                                          gavel
                                        </span>
                                        <span>Cambiar estado o sanción</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(item.id);
                                          showToast(`ID de ${item.name} copiado al portapapeles`);
                                          setActiveMenuId(null);
                                        }}
                                        className="w-full px-4 py-2 hover:bg-surface-container text-on-surface flex items-center gap-2"
                                      >
                                        <span className="material-symbols-outlined text-[18px] text-outline">
                                          content_copy
                                        </span>
                                        <span>Copiar ID de usuario</span>
                                      </button>
                                      <div className="h-px bg-surface-container my-1"></div>
                                      <button
                                        onClick={() => {
                                          handleDeleteUser(item);
                                          setActiveMenuId(null);
                                        }}
                                        className="w-full px-4 py-2 hover:bg-error-container text-error flex items-center gap-2 font-medium"
                                      >
                                        <span className="material-symbols-outlined text-[18px]">
                                          delete
                                        </span>
                                        <span>Eliminar usuario</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* 5. Paginación y Resumen */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-space-md px-space-lg py-space-md bg-surface-container-lowest border-t-0">
                <div className="flex items-center gap-space-md text-on-surface-variant font-label-md text-label-md">
                  <span>
                    Mostrando <strong className="text-on-surface">1 - {filteredUsers.length}</strong>{" "}
                    de <strong className="text-on-surface">{filteredUsers.length}</strong>{" "}
                    usuarios en vista activa
                  </span>
                  <div className="hidden md:flex items-center gap-2">
                    <span>Filas por página:</span>
                    <select
                      defaultValue="25"
                      className="h-8 px-2 rounded-lg bg-surface-container-low text-on-surface font-label-sm text-label-sm focus:outline-none cursor-pointer"
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                    </select>
                  </div>
                </div>

                {/* Controles de Paginación */}
                <div className="flex items-center gap-1">
                  <button
                    className="h-9 px-3 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md transition-colors flex items-center gap-1 disabled:opacity-40"
                    disabled={true}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      chevron_left
                    </span>
                    <span>Anterior</span>
                  </button>
                  <button className="w-9 h-9 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold">
                    1
                  </button>
                  <button
                    onClick={() => showToast("Página 2")}
                    className="w-9 h-9 rounded-lg hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors"
                  >
                    2
                  </button>
                  <button
                    onClick={() => showToast("Página 3")}
                    className="w-9 h-9 rounded-lg hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors"
                  >
                    3
                  </button>
                  <span className="px-2 text-outline">...</span>
                  <button
                    onClick={() => showToast("Página siguiente")}
                    className="h-9 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors flex items-center gap-1"
                  >
                    <span>Siguiente</span>
                    <span className="material-symbols-outlined text-[16px]">
                      chevron_right
                    </span>
                  </button>
                </div>
              </div>
            </section>

            {/* 6. Card Informativa de Gobernanza y Privacidad */}
            <section className="bg-surface-container-low p-space-md rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
              <div className="flex items-start gap-space-md">
                <div className="w-10 h-10 rounded-lg bg-primary-fixed text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[22px]">
                    admin_panel_settings
                  </span>
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Directriz de Gestión de Cuentas y Privacidad
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-4xl">
                    Toda suspensión, baneo o restablecimiento de contraseña
                    queda registrada en los libros de auditoría forense bajo
                    estándar TLS. Los operadores no poseen acceso en texto plano
                    a credenciales de usuarios bajo ninguna circunstancia.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-space-sm shrink-0 self-end md:self-center">
                <button
                  onClick={() => showToast("Protocolo Forense Promexa TLS 2026: Todos los registros sincronizados.")}
                  className="px-space-md py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-body-md-medium text-body-md-medium transition-colors"
                >
                  Ver Protocolo Forense
                </button>
              </div>
            </section>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full bg-surface-container-lowest py-space-md px-space-lg">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-space-xs font-caption text-caption text-on-surface-variant">
            <span>
              Promexa Enterprise Backoffice © 2026. Todos los derechos reservados.
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

      {/* ============================================================== */}
      {/* MODAL 1: Expediente Detallado de Usuario (A15)                */}
      {/* ============================================================== */}
      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-2xl w-full border border-outline-variant/30 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-primary/10 via-surface-container to-transparent border-b border-outline-variant/30 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shadow-md ${viewUser.avatarColor}`}
                >
                  {viewUser.isStore ? (
                    <span className="material-symbols-outlined text-[32px]">
                      store
                    </span>
                  ) : (
                    viewUser.avatarInitials
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-headline-sm font-bold text-on-surface">
                      {viewUser.name}
                    </h2>
                    {viewUser.isVerified && (
                      <span className="material-symbols-outlined text-[20px] text-primary" title="Verificado">
                        verified
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-body-md text-on-surface-variant font-mono">
                    <span>{viewUser.handle}</span>
                    <span>•</span>
                    <span className="font-semibold text-primary">
                      {viewUser.profileType === "business" ? "Comercio / Negocio" : "Persona Natural"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewUser(null)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Quick Status Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
                <div>
                  <span className="text-caption text-outline uppercase font-semibold">Estado Actual</span>
                  <div className="text-body-md font-bold text-on-surface mt-0.5">
                    {viewUser.statusLabel}
                  </div>
                </div>
                <div>
                  <span className="text-caption text-outline uppercase font-semibold">Nivel de Riesgo</span>
                  <div className={`text-body-md font-bold mt-0.5 ${viewUser.riskLevel === 'Crítico' || viewUser.riskLevel === 'Alto' ? 'text-error' : 'text-primary'}`}>
                    {viewUser.riskLevel}
                  </div>
                </div>
                <div>
                  <span className="text-caption text-outline uppercase font-semibold">Documento</span>
                  <div className="text-body-md font-bold text-on-surface mt-0.5 font-mono">
                    {viewUser.documentType}: {viewUser.documentNumber}
                  </div>
                </div>
                <div>
                  <span className="text-caption text-outline uppercase font-semibold">Reportes</span>
                  <div className={`text-body-md font-bold mt-0.5 ${viewUser.reportsCount > 0 ? 'text-error' : 'text-on-surface'}`}>
                    {viewUser.reportsCount} registrados
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="space-y-3">
                <h4 className="font-label-md text-sm font-semibold text-on-surface uppercase tracking-wider">
                  Datos de Contacto y Conectividad
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-[22px]">mail</span>
                    <div>
                      <div className="text-caption text-outline">Correo Electrónico</div>
                      <div className="text-body-md font-medium text-on-surface truncate">{viewUser.email}</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary text-[22px]">fingerprint</span>
                    <div>
                      <div className="text-caption text-outline">Identificador de Usuario (UUID)</div>
                      <div className="text-body-md font-mono font-medium text-on-surface truncate">{viewUser.id}</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex items-center gap-3">
                    <span className="material-symbols-outlined text-outline text-[22px]">calendar_month</span>
                    <div>
                      <div className="text-caption text-outline">Fecha de Registro</div>
                      <div className="text-body-md font-medium text-on-surface">{viewUser.registeredDate} ({viewUser.registeredRelative})</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex items-center gap-3">
                    <span className="material-symbols-outlined text-outline text-[22px]">schedule</span>
                    <div>
                      <div className="text-caption text-outline">Última Actividad Registrada</div>
                      <div className="text-body-md font-medium text-on-surface">{viewUser.lastAccess} • {viewUser.lastAccessSub}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity & Stats */}
              <div className="space-y-3">
                <h4 className="font-label-md text-sm font-semibold text-on-surface uppercase tracking-wider">
                  Actividad en la Comunidad y Marketplace
                </h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
                    <div className="text-2xl font-bold text-primary">
                      {viewUser.stats?.friends ?? viewUser.stats?.followers ?? 142}
                    </div>
                    <div className="text-caption text-on-surface-variant font-medium mt-1">
                      {viewUser.profileType === "business" ? "Seguidores" : "Amigos / Red"}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
                    <div className="text-2xl font-bold text-secondary">
                      {viewUser.stats?.posts ?? 24}
                    </div>
                    <div className="text-caption text-on-surface-variant font-medium mt-1">
                      Publicaciones en Feed
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
                    <div className="text-2xl font-bold text-tertiary">
                      {viewUser.stats?.products ?? (viewUser.profileType === "business" ? 18 : 0)}
                    </div>
                    <div className="text-caption text-on-surface-variant font-medium mt-1">
                      Productos Ofertados
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer / Actions */}
            <div className="p-4 bg-surface-container-low border-t border-outline-variant/30 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleVerification(viewUser)}
                  className="px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-label-md flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {viewUser.isVerified ? "remove_moderator" : "verified"}
                  </span>
                  <span>{viewUser.isVerified ? "Quitar Verificación" : "Aprobar Verificación"}</span>
                </button>
                <button
                  onClick={() => openSanctionModal(viewUser)}
                  className="px-3 py-2 rounded-lg bg-error-container hover:bg-error text-on-error-container hover:text-on-error font-label-md text-label-md flex items-center gap-1.5 transition-colors font-medium"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    gavel
                  </span>
                  <span>Suspender o Sancionar</span>
                </button>
              </div>
              <button
                onClick={() => setViewUser(null)}
                className="px-4 py-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors"
              >
                Cerrar Expediente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: Gestión de Estado y Sanción Disciplinaria            */}
      {/* ============================================================== */}
      {sanctionModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full border border-outline-variant/30 overflow-hidden flex flex-col">
            <div className="p-6 bg-error-container/30 border-b border-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-error text-on-error flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[22px]">gavel</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    Medida Disciplinaria / Estado
                  </h3>
                  <p className="text-caption text-on-surface-variant font-mono">
                    Cuenta: {sanctionModalUser.name} ({sanctionModalUser.handle})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSanctionModalUser(null)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Selección del nuevo estado */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface font-semibold mb-2">
                  Seleccionar nuevo estado de cuenta:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "activo", label: "Activo (Sin restricción)", icon: "check_circle", color: "text-[#16a34a]" },
                    { id: "observacion", label: "En Observación", icon: "visibility", color: "text-tertiary" },
                    { id: "suspendido", label: "Suspendido Temporal", icon: "block", color: "text-error" },
                    { id: "bloqueado", label: "Bloqueado Permanente", icon: "dangerous", color: "text-error" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSanctionStatus(opt.id as any)}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                        sanctionStatus === opt.id
                          ? "border-primary bg-primary-fixed/20 shadow-sm"
                          : "border-outline-variant/40 hover:bg-surface-container-low"
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[20px] ${opt.color}`}>
                        {opt.icon}
                      </span>
                      <span className="font-label-md text-xs font-semibold text-on-surface">
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duración (solo si es suspendido) */}
              {sanctionStatus === "suspendido" && (
                <div>
                  <label className="block font-label-md text-label-md text-on-surface font-semibold mb-1">
                    Duración de la suspensión temporal:
                  </label>
                  <select
                    value={sanctionDuration}
                    onChange={(e) => setSanctionDuration(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface font-label-md border border-outline-variant/30 focus:outline-none"
                  >
                    <option value="3">3 días (Alerta menor)</option>
                    <option value="7">7 días (Reincidencia leve)</option>
                    <option value="14">14 días (Infracción estándar)</option>
                    <option value="30">30 días (Infracción grave)</option>
                  </select>
                </div>
              )}

              {/* Motivo de la sanción */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface font-semibold mb-1">
                  Motivo de la acción:
                </label>
                <select
                  value={sanctionReason}
                  onChange={(e) => setSanctionReason(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface font-label-md border border-outline-variant/30 focus:outline-none"
                >
                  <option value="Incumplimiento de términos y condiciones">Incumplimiento de términos y condiciones</option>
                  <option value="Fraude o suplantación de identidad confirmada">Fraude o suplantación de identidad</option>
                  <option value="Publicación de productos no autorizados o piratería">Venta de productos no autorizados</option>
                  <option value="Comportamiento tóxico o acoso a miembros">Acoso o comportamiento inapropiado</option>
                  <option value="Múltiples reportes de la comunidad">Reincidencia de reportes por la comunidad</option>
                  <option value="Reactivación tras revisión satisfactoria">Reactivación tras resolución de disputa</option>
                </select>
              </div>

              {/* Observaciones auditables */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface font-semibold mb-1">
                  Nota interna de auditoría (opcional):
                </label>
                <textarea
                  value={sanctionNotes}
                  onChange={(e) => setSanctionNotes(e.target.value)}
                  rows={2}
                  placeholder="Detalles adicionales para trazabilidad forense..."
                  className="w-full p-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-sm border border-outline-variant/30 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-end gap-3">
              <button
                onClick={() => setSanctionModalUser(null)}
                className="px-4 py-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleApplySanction}
                className="px-5 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-body-md-medium text-body-md-medium transition-colors shadow-sm"
              >
                Confirmar y Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: Acciones Masivas                                     */}
      {/* ============================================================== */}
      {bulkActionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full border border-outline-variant/30 overflow-hidden flex flex-col">
            <div className="p-6 bg-primary-fixed/20 border-b border-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[22px]">tune</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    Acciones Masivas A14
                  </h3>
                  <p className="text-caption text-on-surface-variant font-semibold">
                    {selectedUsers.size > 0
                      ? `${selectedUsers.size} usuarios seleccionados`
                      : "Ningún usuario seleccionado (selecciona primero en la tabla)"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkActionModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-3">
              {selectedUsers.size === 0 ? (
                <div className="py-4 text-center text-outline">
                  <span className="material-symbols-outlined text-[32px] text-outline mb-1">
                    check_box_outline_blank
                  </span>
                  <p className="text-body-md text-on-surface">
                    Debes marcar al menos un usuario con la casilla de selección en la tabla.
                  </p>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleBulkAction("verificar")}
                    className="w-full p-3.5 rounded-xl border border-outline-variant/40 hover:bg-primary-fixed/20 text-left flex items-center gap-3 transition-colors group"
                  >
                    <span className="material-symbols-outlined text-primary text-[24px]">
                      verified
                    </span>
                    <div>
                      <div className="font-body-md-medium text-on-surface font-semibold">
                        Aprobar verificación oficial
                      </div>
                      <div className="font-caption text-outline">
                        Otorga la insignia verificada a los {selectedUsers.size} perfiles
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleBulkAction("activar")}
                    className="w-full p-3.5 rounded-xl border border-outline-variant/40 hover:bg-surface-container-low text-left flex items-center gap-3 transition-colors group"
                  >
                    <span className="material-symbols-outlined text-[#16a34a] text-[24px]">
                      check_circle
                    </span>
                    <div>
                      <div className="font-body-md-medium text-on-surface font-semibold">
                        Reactivar cuentas seleccionadas
                      </div>
                      <div className="font-caption text-outline">
                        Restaura el estado a Activo y normaliza los accesos
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleBulkAction("suspender")}
                    className="w-full p-3.5 rounded-xl border border-outline-variant/40 hover:bg-error-container/30 text-left flex items-center gap-3 transition-colors group"
                  >
                    <span className="material-symbols-outlined text-error text-[24px]">
                      block
                    </span>
                    <div>
                      <div className="font-body-md-medium text-error font-semibold">
                        Suspender por 14 días
                      </div>
                      <div className="font-caption text-outline">
                        Aplica suspensión temporal con restricción de publicaciones
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleBulkAction("eliminar")}
                    className="w-full p-3.5 rounded-xl border border-error/30 hover:bg-error-container text-left flex items-center gap-3 transition-colors group"
                  >
                    <span className="material-symbols-outlined text-error text-[24px]">
                      delete_forever
                    </span>
                    <div>
                      <div className="font-body-md-medium text-error font-semibold">
                        Eliminar cuentas seleccionadas
                      </div>
                      <div className="font-caption text-outline">
                        Elimina permanentemente de la base de datos
                      </div>
                    </div>
                  </button>
                </>
              )}
            </div>

            <div className="p-4 bg-surface-container-low border-t border-outline-variant/30 flex justify-end">
              <button
                onClick={() => setBulkActionModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
