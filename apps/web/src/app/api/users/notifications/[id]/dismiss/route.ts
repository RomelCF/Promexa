import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const backendUrl = process.env.API_URL || 'http://localhost:3001/api/v1';

  try {
    const authHeader = request.headers.get('authorization');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const res = await fetch(`${backendUrl}/users/notifications/${id}/dismiss`, {
      method: 'POST',
      headers,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al comunicarse con el backend' },
      { status: 503 }
    );
  }
}
