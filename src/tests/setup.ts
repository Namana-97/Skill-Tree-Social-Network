import { jest } from '@jest/globals';

import { prismaMock, resetPrismaMock } from '@/tests/prisma-mock';
import { resetRateLimiters } from '@/middleware/rate-limit';

Object.assign(process.env, {
  JWT_SECRET: 'test-secret-at-least-32-characters-long',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  NODE_ENV: 'test'
});

jest.mock('@/lib/prisma', () => ({
  prisma: prismaMock
}));

jest.mock('@/lib/realtime', () => ({
  publishEvent: jest.fn()
}));

jest.mock('@/lib/search', () => ({
  enqueueSearchSync: jest.fn(),
  flushSearchQueue: jest.fn()
}));

jest.mock('@/lib/email', () => ({
  queueEmailNotification: jest.fn(),
  flushEmailQueue: jest.fn()
}));

beforeEach(() => {
  resetPrismaMock();
  resetRateLimiters();
  delete (globalThis as Record<string, unknown>).fetch;
});
