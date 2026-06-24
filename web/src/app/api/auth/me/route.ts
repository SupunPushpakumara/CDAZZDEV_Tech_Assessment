import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import backendAxios from '@/lib/backendAxios';

// Helper function to decode JWT payload without verification
function decodeJwtPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(payload);
  } catch (e) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    let accessToken = cookieStore.get('accessToken')?.value;
    const refreshToken = cookieStore.get('refreshToken')?.value;

    if (!accessToken && !refreshToken) {
      return NextResponse.json({ message: 'No active session found' }, { status: 401 });
    }

    // Case 1: Access Token is missing but we have a Refresh Token (trigger silent rotation)
    if (!accessToken && refreshToken) {
      console.log('🔄 Access token missing, performing silent refresh rotation...');
      try {
        const response = await backendAxios.post('/auth/refresh', { refreshToken });
        const tokens = response.data;
        accessToken = tokens.accessToken;

        // Update cookies with new rotated tokens
        cookieStore.set('accessToken', tokens.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 15,
        });

        cookieStore.set('refreshToken', tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        });
      } catch (err) {
        // Refresh token is invalid/expired - clear cookies
        cookieStore.set('accessToken', '', { path: '/', maxAge: 0 });
        cookieStore.set('refreshToken', '', { path: '/', maxAge: 0 });
        return NextResponse.json({ message: 'Session expired' }, { status: 401 });
      }
    }

    // Case 2: Parse current active token
    if (accessToken) {
      const decoded = decodeJwtPayload(accessToken);
      if (!decoded) {
        return NextResponse.json({ message: 'Invalid token payload' }, { status: 401 });
      }

      // Check if access token is expired
      const isExpired = decoded.exp * 1000 < Date.now();
      if (isExpired && refreshToken) {
        // Access token expired, try to refresh
        console.log('🔄 Access token expired, triggering rotation...');
        try {
          const response = await backendAxios.post('/auth/refresh', { refreshToken });
          const tokens = response.data;
          
          cookieStore.set('accessToken', tokens.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 15,
          });

          cookieStore.set('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
          });

          const newDecoded = decodeJwtPayload(tokens.accessToken);
          if (newDecoded) {
            return NextResponse.json({
              user: {
                id: newDecoded.sub,
                email: newDecoded.email,
                role: newDecoded.role,
                name: newDecoded.name,
              },
            });
          }
        } catch (err) {
          // If refresh fails, clear cookies
          cookieStore.set('accessToken', '', { path: '/', maxAge: 0 });
          cookieStore.set('refreshToken', '', { path: '/', maxAge: 0 });
          return NextResponse.json({ message: 'Session expired' }, { status: 401 });
        }
      }

      // Return user profile mapped from active token claims
      return NextResponse.json({
        user: {
          id: decoded.sub,
          email: decoded.email,
          role: decoded.role,
          name: decoded.name,
        },
      });
    }

    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  } catch (error) {
    console.error('BFF Session restore error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
