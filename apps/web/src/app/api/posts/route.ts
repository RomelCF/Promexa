import { NextResponse } from 'next/server';

async function forward(request: Request, method: 'GET' | 'POST') {
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return NextResponse.json({ message: 'Se requiere un token de acceso' }, { status: 401 });
  }
  const backendUrl = process.env.API_URL || 'http://localhost:3001/api/v1';
  const query = new URL(request.url).search;
  try {
    const res = await fetch(`${backendUrl}/posts${query}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: authorization },
      body: method === 'POST' ? await request.text() : undefined,
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ message: 'Backend no disponible' }, { status: 503 });
  }
}

export async function GET(request: Request) {
  return forward(request, 'GET');
}

export async function POST(request: Request) {
  return forward(request, 'POST');
}
