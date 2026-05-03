import { NextRequest } from 'next/server';

import { generateToken, verifyToken } from '@/lib/jwt';
import {
  hashPassword,
  optionalAuth,
  readBearerToken,
  requireAuth,
  verifyPassword
} from '@/lib/auth';

describe('Authentication', () => {
  describe('hashPassword', () => {
    it('hashes a password successfully', async () => {
      const password = 'testPassword123';
      const hashed = await hashPassword(password);

      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(0);
    });

    it('generates different hashes for the same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('verifies the correct password', async () => {
      const password = 'testPassword123';
      const hashed = await hashPassword(password);
      const isValid = await verifyPassword(password, hashed);

      expect(isValid).toBe(true);
    });

    it('rejects an incorrect password', async () => {
      const password = 'testPassword123';
      const hashed = await hashPassword(password);
      const isValid = await verifyPassword('wrongPassword', hashed);

      expect(isValid).toBe(false);
    });
  });

  describe('JWT tokens', () => {
    it('generates a valid token', () => {
      const payload = { userId: 1, username: 'testuser' };
      const token = generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    it('verifies a valid token', () => {
      const payload = { userId: 1, username: 'testuser' };
      const token = generateToken(payload);
      const decoded = verifyToken<{ userId: number; username: string }>(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.username).toBe(payload.username);
    });

    it('rejects an invalid token', () => {
      expect(() => verifyToken('invalid.token.here')).toThrow();
    });

    it('rejects an expired token', async () => {
      const payload = { userId: 1, username: 'testuser' };
      const token = generateToken(payload, '1ms');

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(() => verifyToken(token)).toThrow();
    });
  });

  describe('request auth helpers', () => {
    it('reads a bearer token from the authorization header', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          authorization: 'Bearer test-token'
        }
      });

      expect(readBearerToken(request)).toBe('test-token');
    });

    it('returns null when no bearer token exists', () => {
      const request = new NextRequest('http://localhost/api/test');

      expect(readBearerToken(request)).toBeNull();
    });

    it('requires auth for protected requests', () => {
      const token = generateToken({
        id: 1,
        username: 'authuser',
        email: 'auth@example.com'
      });
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      const payload = requireAuth(request);

      expect(payload.id).toBe(1);
      expect(payload.username).toBe('authuser');
    });

    it('throws when auth is required but missing', () => {
      const request = new NextRequest('http://localhost/api/test');

      expect(() => requireAuth(request)).toThrow(
        'Unauthorized: No token provided.'
      );
    });

    it('returns null for invalid optional auth tokens', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          authorization: 'Bearer invalid.token.here'
        }
      });

      expect(optionalAuth(request)).toBeNull();
    });
  });
});
