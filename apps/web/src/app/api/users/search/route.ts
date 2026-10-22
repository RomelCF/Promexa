import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const backendUrl = process.env.API_URL || 'http://localhost:3001/api/v1';

  if (!q.trim()) {
    return NextResponse.json([]);
  }

  try {
    const authHeader = request.headers.get('authorization');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const res = await fetch(`${backendUrl}/users/search?q=${encodeURIComponent(q)}`, {
      headers,
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json(
      { error: 'Error al consultar usuarios en el backend' },
      { status: res.status }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Backend no disponible o error de red' },
      { status: 503 }
    );
  }
}
