import { NextResponse, type NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth/server';

export default function middleware(request: NextRequest) {
  const auth = getAuth();
  if (!auth) {
    return new NextResponse(
      'Server auth is not configured. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET.',
      { status: 500 },
    );
  }
  return auth.middleware({ loginUrl: '/auth/sign-in' })(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|auth).*)'],
};
