import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import backendAxios from '@/lib/backendAxios';

async function setRotatedCookies(cookiesToSet: { accessToken: string; refreshToken: string }) {
  const cookieStore = await cookies();
  cookieStore.set('accessToken', cookiesToSet.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15,
  });
  cookieStore.set('refreshToken', cookiesToSet.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

async function getValidAccessToken() {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get('accessToken')?.value;
  const refreshToken = cookieStore.get('refreshToken')?.value;

  if (accessToken) {
    // Decode and check expiration without verification
    const parts = accessToken.split('.');
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        const isExpired = payload.exp * 1000 < Date.now();
        if (!isExpired) {
          return { accessToken, cookiesToSet: null };
        }
      } catch (e) {
        // Fall through to refresh
      }
    }
  }

  // Token is missing or expired - trigger rotation using the refresh token
  if (refreshToken) {
    console.log('🔄 Proxy detected expired/missing token, performing silent refresh...');
    try {
      const response = await backendAxios.post('/auth/refresh', { refreshToken });
      const tokens = response.data;
      return {
        accessToken: tokens.accessToken,
        cookiesToSet: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      };
    } catch (err) {
      console.error('Failed to rotate tokens during proxy call:', err);
    }
  }

  return { accessToken: null, cookiesToSet: null };
}

async function handleProxy(
  request: NextRequest,
  pathSegments: string[],
) {
  let cookiesToSet: any = null;
  try {
    const tokenResult = await getValidAccessToken();
    const accessToken = tokenResult.accessToken;
    cookiesToSet = tokenResult.cookiesToSet;

    if (!accessToken) {
      return NextResponse.json({ message: 'Unauthorized session' }, { status: 401 });
    }

    const path = pathSegments.join('/');
    const method = request.method;
    let body: any = null;
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      body = await request.text();
    }

    // Call NestJS via backendAxios
    let parsedBody = body;
    try {
      if (body) parsedBody = JSON.parse(body);
    } catch (e) {
      // Keep as raw if not JSON
    }

    // Build query params
    const queryParams: Record<string, string> = {};
    request.nextUrl.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const axiosConfig: any = {
      url: `/${path}`,
      method,
      params: queryParams,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    };

    if (parsedBody !== null) {
      axiosConfig.data = parsedBody;
    }

    const response = await backendAxios(axiosConfig);

    const nextResponse = NextResponse.json(response.data, { status: response.status });

    // Set updated cookies if a refresh occurred
    if (cookiesToSet) {
      await setRotatedCookies(cookiesToSet);
    }

    return nextResponse;
  } catch (error: any) {
    // If the backend returned a non-2xx status code
    if (error.status && error.data) {
      const nextResponse = NextResponse.json(error.data, { status: error.status });
      if (cookiesToSet) {
        await setRotatedCookies(cookiesToSet);
      }
      return nextResponse;
    }
    
    console.error(`BFF Proxy Error [${request.method}]:`, error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> | any }) {
  // Support both Next.js 14 and 15 dynamic routing types
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  return handleProxy(request, resolvedParams.path);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> | any }) {
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  return handleProxy(request, resolvedParams.path);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> | any }) {
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  return handleProxy(request, resolvedParams.path);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> | any }) {
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  return handleProxy(request, resolvedParams.path);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> | any }) {
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  return handleProxy(request, resolvedParams.path);
}
