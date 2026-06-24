import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import backendAxios from '@/lib/backendAxios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rememberMe, ...credentials } = body;

    // Call the NestJS Backend API using backendAxios
    const response = await backendAxios.post('/auth/login', credentials);
    const { user, accessToken, refreshToken } = response.data;

    // Set secure HTTP-only cookies
    const cookieStore = await cookies();
    
    cookieStore.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 15, // 15 minutes (always short-lived)
    });

    // "Remember Me" controls refresh token cookie persistence:
    // Checked  → 30-day persistent cookie (survives browser restart)
    // Unchecked → session cookie (expires when browser closes)
    cookieStore.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      ...(rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}), // 30 days or session
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('BFF Login Error:', error);
    const status = error.status || 500;
    const message = error.message || 'Internal Server Error';
    return NextResponse.json({ message }, { status });
  }
}

