import type { NextRequest } from 'next/server';

import { securityHeaders } from '@/middleware/security';

export function middleware(request: NextRequest) {
  return securityHeaders(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
