import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import backendAxios from '@/lib/backendAxios';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    if (accessToken) {
      // Notify NestJS backend to invalidate the refresh token
      await backendAxios.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }).catch((err) => {
        console.error('NestJS logout failed but clearing cookies anyway:', err);
      });
    }

    // Clear cookies
    cookieStore.set('accessToken', '', { path: '/', maxAge: 0 });
    cookieStore.set('refreshToken', '', { path: '/', maxAge: 0 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('BFF Logout Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
