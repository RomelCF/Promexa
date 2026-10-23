import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const backendUrl = process.env.API_URL || 'http://localhost:3001/api/v1';

  try {
    const res = await fetch(`${backendUrl}/users/recommended`, {
      headers: { Authorization: authorization },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ message: 'Backend no disponible' }, { status: 503 });
  }
}
