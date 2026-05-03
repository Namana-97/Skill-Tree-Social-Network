import { NextRequest } from 'next/server';

import {
  authLimiter,
  resetRateLimiters,
  withRateLimit
} from '@/middleware/rate-limit';

describe('Rate limiting middleware', () => {
  beforeEach(() => {
    resetRateLimiters();
  });

  it('allows requests under the configured limit', async () => {
    const handler = jest.fn(async () => Response.json({ ok: true }));
    const wrapped = withRateLimit(authLimiter, handler);
    const request = new NextRequest('http://localhost/api/auth/login', {
      headers: {
        'x-forwarded-for': '127.0.0.1'
      }
    });

    const response = await wrapped(request);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });

  it('returns 429 after the limit is exceeded', async () => {
    const handler = jest.fn(async () => Response.json({ ok: true }));
    const wrapped = withRateLimit(authLimiter, handler);

    for (let index = 0; index < 5; index += 1) {
      await wrapped(
        new NextRequest('http://localhost/api/auth/login', {
          headers: {
            'x-forwarded-for': '10.0.0.1'
          }
        })
      );
    }

    const response = await wrapped(
      new NextRequest('http://localhost/api/auth/login', {
        headers: {
          'x-forwarded-for': '10.0.0.1'
        }
      })
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toContain('Too many authentication attempts');
  });
});
