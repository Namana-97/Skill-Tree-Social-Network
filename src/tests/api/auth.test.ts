import { NextRequest } from 'next/server';

import { POST as loginHandler } from '@/app/api/auth/login/route';
import { POST as registerHandler } from '@/app/api/auth/register/route';
import { hashPassword } from '@/lib/auth';
import { prismaMock } from '@/tests/prisma-mock';

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('registers a new user with valid data', async () => {
      (prismaMock.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaMock.user.create as jest.Mock).mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'testuser',
        roleTitle: '',
        level: 1,
        xp: 0
      });

      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          username: `testuser_${Date.now()}`,
          email: `test${Date.now()}@example.com`,
          password: 'securePassword123'
        })
      });

      const response = await registerHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.token).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.username).toBeDefined();
    });

    it('rejects registration with missing fields', async () => {
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          username: 'testuser'
        })
      });

      const response = await registerHandler(request);

      expect(response.status).toBe(400);
    });

    it('rejects weak passwords', async () => {
      const request = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          username: 'testuser',
          email: 'test@example.com',
          password: '123'
        })
      });

      const response = await registerHandler(request);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with correct username credentials', async () => {
      (prismaMock.user.findFirst as jest.Mock).mockResolvedValue({
        id: 10,
        username: 'logintest',
        email: 'logintest@example.com',
        passwordHash: await hashPassword('testPassword123'),
        displayName: 'Login Test',
        roleTitle: '',
        bio: null,
        avatarInitials: 'LT',
        avatarColor: '#E63B3B',
        xp: 0,
        level: 1,
        createdAt: new Date()
      });

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          username: 'logintest',
          password: 'testPassword123'
        })
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.token).toBeDefined();
    });

    it('rejects incorrect passwords', async () => {
      (prismaMock.user.findFirst as jest.Mock).mockResolvedValue({
        id: 10,
        username: 'logintest',
        email: 'logintest@example.com',
        passwordHash: await hashPassword('testPassword123'),
        displayName: 'Login Test',
        roleTitle: '',
        bio: null,
        avatarInitials: 'LT',
        avatarColor: '#E63B3B',
        xp: 0,
        level: 1,
        createdAt: new Date()
      });

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          username: 'logintest',
          password: 'wrongPassword'
        })
      });

      const response = await loginHandler(request);

      expect(response.status).toBe(401);
    });
  });
});
