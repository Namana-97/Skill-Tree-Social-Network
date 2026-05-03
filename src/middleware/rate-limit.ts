type RateLimitConfig = {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (request: Request) => string;
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  message: string;
};

type RateLimiter = {
  hit: (request: Request) => RateLimitResult;
};

const stores = new Map<string, Map<string, RateLimitState>>();

export function resetRateLimiters() {
  stores.clear();
}

function getClientIp(request: Request) {
  const forwarded =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown';

  return forwarded.split(',')[0]?.trim() || 'unknown';
}

function createRateLimiter(name: string, config: RateLimitConfig): RateLimiter {
  const store = stores.get(name) || new Map<string, RateLimitState>();
  stores.set(name, store);

  return {
    hit(request: Request) {
      const now = Date.now();
      const key = (config.keyGenerator || getClientIp)(request);
      const state = store.get(key);

      if (!state || state.resetAt <= now) {
        const next = {
          count: 1,
          resetAt: now + config.windowMs
        };
        store.set(key, next);
        return {
          allowed: true,
          limit: config.max,
          remaining: Math.max(0, config.max - next.count),
          resetAt: next.resetAt,
          message: config.message
        };
      }

      if (state.count >= config.max) {
        return {
          allowed: false,
          limit: config.max,
          remaining: 0,
          resetAt: state.resetAt,
          message: config.message
        };
      }

      state.count += 1;
      store.set(key, state);
      return {
        allowed: true,
        limit: config.max,
        remaining: Math.max(0, config.max - state.count),
        resetAt: state.resetAt,
        message: config.message
      };
    }
  };
}

function toRateLimitHeaders(result: RateLimitResult) {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000))
  };
}

export const authLimiter = createRateLimiter('auth', {
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later'
});

export const apiLimiter = createRateLimiter('api', {
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please slow down'
});

export const proofVerificationLimiter = createRateLimiter(
  'proof-verification',
  {
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: 'GitHub verification rate limit reached, please try again later'
  }
);

export const vouchLimiter = createRateLimiter('vouches', {
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many vouches created, please slow down'
});

export function withRateLimit<TRequest extends Request, T extends unknown[]>(
  limiter: RateLimiter,
  handler: (request: TRequest, ...args: T) => Promise<Response> | Response
) {
  return async (request: TRequest, ...args: T) => {
    const result = limiter.hit(request);

    if (!result.allowed) {
      return Response.json(
        { error: result.message },
        {
          status: 429,
          headers: toRateLimitHeaders(result)
        }
      );
    }

    const response = await handler(request, ...args);
    const headers = toRateLimitHeaders(result);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  };
}
