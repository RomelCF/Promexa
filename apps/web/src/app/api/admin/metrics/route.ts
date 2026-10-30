import { NextResponse } from 'next/server';
export async function GET(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization) return NextResponse.json({ message: 'Inicia sesion para continuar' }, { status: 401 });
  const days = new URL(request.url).searchParams.get('days') || '30';
  if (!['7', '30', '90'].includes(days)) return NextResponse.json({ message: 'Periodo invalido' }, { status: 400 });
  try {
    const response = await fetch(`${process.env.API_URL || 'http://localhost:3001/api/v1'}/admin/metrics?days=${days}`, {
      headers: { Authorization: authorization }, cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch { return NextResponse.json({ message: 'No se pudieron consultar las metricas. Verifica que la API este disponible.' }, { status: 503 }); }
}
