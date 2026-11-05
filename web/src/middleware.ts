import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname === '/login' || pathname === '/signup';

  // If user is not authenticated and trying to access protected route, redirect to /login
  if (!sessionCookie && !isAuthPage) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('callbackUrl', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // If user is authenticated and trying to access /login or /signup, redirect to /
  if (sessionCookie && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (Better Auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon.svg, weave-mark.svg (public images and icons)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|icon.svg|weave-mark.svg).*)',
  ],
};
