import { NextResponse } from 'next/server';
export async function GET(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const response = await fetch(`${process.env.API_URL || 'http://localhost:3001/api/v1'}/users/admin/all`, {
      headers: { Authorization: authorization }, cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json(data, { status: response.status });
    if (!Array.isArray(data)) throw new Error('Invalid directory');
    return NextResponse.json(data.map((user: any) => {
      const business = user.profileType === 'business';
      const lastLogin = user.dailyAccesses?.[0]?.lastLoginAt;
      return {
        id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar,
        handle: `@${user.name.toLowerCase().replace(/\s+/g, '_')}`,
        profileType: user.profileType, isStore: business, isVerified: user.isVerified,
        subtitle: business ? 'Comercio registrado' : undefined,
        documentType: business ? 'RUC' : 'DNI', documentNumber: 'No registrado',
        status: business && !user.isVerified ? 'verificacion' : 'activo',
        statusLabel: business && !user.isVerified ? 'En verificacion' : 'Activo',
        registeredDate: new Date(user.createdAt).toLocaleDateString('es-PE', { timeZone: 'America/Lima' }),
        registeredRelative: 'Fecha de registro',
        lastAccess: lastLogin ? new Date(lastLogin).toLocaleString('es-PE', { timeZone: 'America/Lima' }) : 'Sin historial',
        lastAccessSub: lastLogin ? 'Ultimo inicio de sesion registrado' : 'Registro de accesos pendiente',
        reportsCount: 0, reportsLabel: 'Sin metricas de reportes', riskLevel: 'No evaluado',
        avatarInitials: user.name.split(' ').map((word: string) => word[0]).join('').slice(0, 2).toUpperCase(),
        avatarColor: business ? 'bg-primary text-on-primary' : 'bg-secondary-fixed text-on-secondary-fixed',
        stats: {
          friends: business ? 0 : (user._count?.sentFriendRequests || 0) + (user._count?.receivedFriendRequests || 0),
          followers: business ? user._count?.receivedFriendRequests || 0 : 0,
          posts: user._count?.posts || 0, products: user._count?.products || 0,
        },
      };
    }));
  } catch { return NextResponse.json({ message: 'No se pudo consultar el directorio de usuarios' }, { status: 503 }); }
}
