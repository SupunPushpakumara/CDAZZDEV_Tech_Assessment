import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Edge Middleware — Server-side Route Protection
 *
 * Runs BEFORE any page render, preventing unauthenticated users from accessing
 * protected routes and redirecting authenticated users away from auth pages.
 *
 * This is the recommended approach for Next.js App Router because it:
 * 1. Prevents flash-of-content (FOUC) on protected routes
 * 2. Runs at the edge (no client JS required)
 * 3. Handles redirects before React hydration
 */

const PUBLIC_ROUTES = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for session tokens in cookies (set by BFF API routes)
  const accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;
  const hasSession = !!accessToken || !!refreshToken;

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // Redirect unauthenticated users to login
  if (!isPublicRoute && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login/register
  if (isPublicRoute && hasSession) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - API routes (/api/...)
     * - Static files (_next/static, _next/image, favicon.ico)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
