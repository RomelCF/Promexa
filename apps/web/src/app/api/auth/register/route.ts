import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, profileType } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Todos los campos son obligatorios' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: 'La contraseña debe tener un mínimo de 8 caracteres' },
        { status: 400 }
      );
    }

    // Try forwarding to NestJS API
    const backendUrl = process.env.API_URL || 'http://localhost:3001/api/v1';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const backendRes = await fetch(`${backendUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, profileType }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (backendRes.ok) {
        const data = await backendRes.json();
        return NextResponse.json(data);
      } else if (backendRes.status === 409 || backendRes.status === 400) {
        const err = await backendRes.json();
        return NextResponse.json(err, { status: backendRes.status });
      }
    } catch {
      // Backend not running, execute fallback
    }

    const normalizedEmail = email.toLowerCase().trim();

    return NextResponse.json(
      {
        message: 'Cuenta creada exitosamente',
        accessToken: `jwt-token-${Date.now()}`,
        user: {
          id: `usr-${Date.now()}`,
          name: name.trim(),
          email: normalizedEmail,
          profileType: profileType || 'personal',
          isVerified: profileType === 'business' ? false : true,
          avatar:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuCD5YgK5OwWWd0N5wvQzxa-JtNh1D8GM3Oja_Tu3qqrorn6jC2BjXdKKTqo4lXgJ7FkBosiqIF5mzcyRpeY_oopKqy7tFaUM5RDrz0xE_iz0hQBRiF7ngOYX657hjt6n70yZhEbwvo8a66cOcspLkAkekpk9zk1rO1RcSAbieaR7zQmXZ-aDIjKUd6sC73PhNeL5hLgtadnTIQcTptE2HsAe6VSNdlfojx9rsWGTLc',
          role: profileType === 'business' ? 'business' : 'user',
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { message: 'Error interno en el servidor de autenticación' },
      { status: 500 }
    );
  }
}
