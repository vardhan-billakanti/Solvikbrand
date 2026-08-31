import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, verifyJWT } from '@/lib/auth';

const PROTECTED_PATHS = ['/dashboard', '/investigation'];
const API_PROTECTED_PATHS = ['/api/investigations', '/api/auth/logout'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Security headers for all responses
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=()');

  // Check if path needs protection
  const isProtectedPage = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isProtectedApi = API_PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (isProtectedPage || isProtectedApi) {
    const token = getAuthFromRequest(request);

    if (!token) {
      if (isProtectedApi) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      if (isProtectedApi) {
        return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 });
      }
      const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
      redirectResponse.cookies.set('tracelink_session', '', { maxAge: 0 });
      return redirectResponse;
    }
  }

  // Redirect authenticated users away from login
  if (pathname === '/login') {
    const token = getAuthFromRequest(request);
    if (token) {
      const payload = await verifyJWT(token);
      if (payload) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/investigation/:path*',
    '/api/investigations/:path*',
    '/api/auth/logout',
    '/login',
  ],
};
