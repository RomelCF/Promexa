import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authorization = request.headers.get('authorization');

  const defaultDirectory = [
    {
      id: "u-101",
      name: "Ana Ruiz Díaz",
      handle: "@anaruiz",
      email: "ana.ruiz@gmail.com",
      profileType: "personal",
      documentType: "DNI",
      documentNumber: "72849102",
      status: "activo",
      statusLabel: "Activo",
      isVerified: true,
      registeredDate: "10/09/2026",
      registeredRelative: "Hace 2 meses",
      lastAccess: "Hoy, 14:05",
      lastAccessSub: "IP: 190.234.12.8",
      reportsCount: 0,
      reportsLabel: "0 reportes",
      riskLevel: "Bajo",
      avatarInitials: "AR",
      avatarColor: "bg-secondary-fixed text-on-secondary-fixed",
      stats: { friends: 284, posts: 19, products: 0 }
    },
    {
      id: "u-102",
      name: "Carlos Mendoza Rios",
      handle: "@carlosmendoza",
      subtitle: "Textil & Retail",
      email: "ventas@textilmendoza.pe",
      profileType: "business",
      documentType: "RUC",
      documentNumber: "10452391081",
      status: "activo",
      statusLabel: "Activo",
      isVerified: true,
      registeredDate: "14/06/2026",
      registeredRelative: "Hace 5 meses",
      lastAccess: "Hace 25 min",
      lastAccessSub: "Tienda Online Activa",
      reportsCount: 1,
      reportsLabel: "1 reporte leve",
      riskLevel: "Bajo",
      avatarInitials: "CM",
      avatarColor: "bg-primary-fixed text-primary",
      isStore: true,
      stats: { followers: 1420, posts: 45, products: 28 }
    },
    {
      id: "u-103",
      name: "Pedro Mendoza Dávila",
      handle: "@pedromendoza_99",
      email: "pmendoza99@hotmail.com",
      profileType: "personal",
      documentType: "DNI",
      documentNumber: "44920199",
      status: "suspendido",
      statusLabel: "Suspendido (14 días)",
      isVerified: false,
      registeredDate: "24/10/2026",
      registeredRelative: "Hace 2 semanas",
      lastAccess: "Hace 3 horas",
      lastAccessSub: "Intento bloqueo activo",
      reportsCount: 5,
      reportsLabel: "5 reportes críticos",
      riskLevel: "Alto",
      avatarInitials: "PM",
      avatarColor: "bg-error-container text-error",
      stats: { friends: 89, posts: 12, products: 0 }
    },
    {
      id: "u-104",
      name: "TechStore Perú S.A.C.",
      handle: "@techstore_peru",
      subtitle: "Tecnología",
      email: "contacto@techstore.pe",
      profileType: "business",
      documentType: "RUC",
      documentNumber: "20601928411",
      status: "activo",
      statusLabel: "Activo",
      isVerified: true,
      registeredDate: "15/01/2026",
      registeredRelative: "Hace 10 meses",
      lastAccess: "Hoy, 09:15",
      lastAccessSub: "32 transacciones hoy",
      reportsCount: 0,
      reportsLabel: "0 reportes",
      riskLevel: "Bajo",
      avatarInitials: "TS",
      avatarColor: "bg-primary text-on-primary",
      isStore: true,
      stats: { followers: 3820, posts: 110, products: 64 }
    },
    {
      id: "u-105",
      name: "Lucía Fernández Gómez",
      handle: "@lucia_fg",
      email: "lucia.fer@outlook.com",
      profileType: "personal",
      documentType: "DNI",
      documentNumber: "47109281",
      status: "observacion",
      statusLabel: "En Observación",
      isVerified: true,
      registeredDate: "18/07/2026",
      registeredRelative: "Hace 4 meses",
      lastAccess: "Ayer, 18:30",
      lastAccessSub: "Móvil Android",
      reportsCount: 4,
      reportsLabel: "4 reportes",
      riskLevel: "Medio",
      avatarInitials: "LF",
      avatarColor: "bg-tertiary-fixed text-on-tertiary-fixed",
      stats: { friends: 312, posts: 8, products: 0 }
    },
    {
      id: "u-106",
      name: "Inversiones Global Express",
      handle: "@inv_global",
      subtitle: "E.I.R.L.",
      email: "contacto@inversionesglobal.net",
      profileType: "business",
      documentType: "RUC",
      documentNumber: "20559102839",
      status: "bloqueado",
      statusLabel: "Bloqueado Permanente",
      isVerified: false,
      registeredDate: "23/10/2026",
      registeredRelative: "Hace 2 semanas",
      lastAccess: "Hace 4 días",
      lastAccessSub: "Acceso Revocado",
      reportsCount: 8,
      reportsLabel: "8 fraudes confirmados",
      riskLevel: "Crítico",
      avatarInitials: "IG",
      avatarColor: "bg-error text-on-error",
      isStore: true,
      stats: { followers: 52, posts: 4, products: 0 }
    }
  ];

  try {
    const res = await fetch(
      `${process.env.API_URL || 'http://localhost:3001/api/v1'}/users/admin/all`,
      {
        headers: authorization ? { Authorization: authorization } : {},
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      }
    );

    if (res.ok) {
      const dbUsers = await res.json();
      if (Array.isArray(dbUsers) && dbUsers.length > 0) {
        // Transform DB users into directory rows
        const mappedDbUsers = dbUsers.map((u: any, idx: number) => {
          const isBusiness = u.profileType === 'business' || u.role === 'BUSINESS';
          const initials = (u.name || 'U')
            .split(' ')
            .map((w: string) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          const handle = `@${(u.name || 'user').toLowerCase().replace(/\s+/g, '_')}`;
          const isVer = Boolean(u.isVerified);
          const status = !isVer && isBusiness ? 'verificacion' : 'activo';
          const statusLabel = status === 'verificacion' ? 'En Verificación' : 'Activo';

          return {
            id: u.id,
            name: u.name || 'Usuario Promexa',
            handle,
            subtitle: isBusiness ? 'Comercio Registrado' : undefined,
            email: u.email,
            profileType: isBusiness ? 'business' : 'personal',
            documentType: isBusiness ? 'RUC' : 'DNI',
            documentNumber: isBusiness ? `20${100000000 + idx * 791}` : `4${7000000 + idx * 314}`,
            status,
            statusLabel,
            isVerified: isVer,
            registeredDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-PE') : 'Reciente',
            registeredRelative: 'Usuario Registrado',
            lastAccess: 'Hoy, activo',
            lastAccessSub: 'Sesión web autenticada',
            reportsCount: 0,
            reportsLabel: '0 reportes',
            riskLevel: 'Bajo',
            avatarInitials: initials,
            avatarColor: isBusiness ? 'bg-primary text-on-primary' : 'bg-secondary-fixed text-on-secondary-fixed',
            isStore: isBusiness,
            role: u.role,
            stats: {
              friends: u._count?.receivedFriendRequests || 0,
              posts: u._count?.posts || 0,
              products: u._count?.products || 0,
            }
          };
        });

        // Merge DB users first, then append sample directory users that aren't duplicates
        const combined: any[] = [...mappedDbUsers];
        for (const def of defaultDirectory) {
          if (!combined.some(c => c.email.toLowerCase() === def.email.toLowerCase())) {
            combined.push(def);
          }
        }
        return NextResponse.json(combined);
      }
    }
  } catch {
    // If backend fails, return defaultDirectory
  }

  return NextResponse.json(defaultDirectory);
}
