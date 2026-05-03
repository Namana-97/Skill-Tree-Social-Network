import { NextRequest } from 'next/server';

import { middleware } from '@/middleware';
import { securityHeaders } from '@/middleware/security';

describe('Security headers middleware', () => {
  it('adds the expected security headers', () => {
    const request = new NextRequest('http://localhost/profile');
    const response = securityHeaders(request);

    expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('Content-Security-Policy')).toContain(
      "default-src 'self'"
    );
  });

  it('routes through the top-level middleware entry point', () => {
    const request = new NextRequest('http://localhost/discover');
    const response = middleware(request);

    expect(response.headers.get('Referrer-Policy')).toBe(
      'strict-origin-when-cross-origin'
    );
  });
});
