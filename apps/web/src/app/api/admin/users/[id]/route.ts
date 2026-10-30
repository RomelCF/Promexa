import { NextResponse } from 'next/server';
async function forward(request: Request, { params }: { params: { id: string } }) {
  const authorization = request.headers.get('authorization');
  if (!authorization) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  let body;
  if (request.method === 'PATCH') {
    try { body = JSON.stringify(await request.json()); }
    catch { return NextResponse.json({ message: 'Cuerpo de solicitud invalido' }, { status: 400 }); }
  }
  try {
    const response = await fetch(`${process.env.API_URL || 'http://localhost:3001/api/v1'}/users/admin/${encodeURIComponent(params.id)}`, {
      method: request.method, headers: { Authorization: authorization, 'Content-Type': 'application/json' },
      body, cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch { return NextResponse.json({ message: 'No se pudo completar la operacion en el servidor' }, { status: 503 }); }
}
export const PATCH = forward;
export const DELETE = forward;
