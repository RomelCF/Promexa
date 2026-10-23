import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { senderId: string } }
) {
  const authorization = request.headers.get('authorization');
  if (!authorization) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const res = await fetch(
      `${process.env.API_URL || 'http://localhost:3001/api/v1'}/chat/read/${params.senderId}`,
      {
        method: 'POST',
        headers: { Authorization: authorization },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      }
    );
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ message: 'Error marking messages as read' }, { status: 503 });
  }
}
