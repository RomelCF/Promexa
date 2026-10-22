import { NextResponse } from 'next/server';
export async function PATCH(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization) return NextResponse.json({ message: 'Sesion requerida' }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ message: 'Solicitud invalida' }, { status: 400 }); }
  try {
    const res = await fetch(`${process.env.API_URL || 'http://localhost:3001/api/v1'}/users/me/password`, {
      method: 'PATCH', headers: { Authorization: authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch { return NextResponse.json({ message: 'No se pudo conectar con el servidor' }, { status: 503 }); }
}
