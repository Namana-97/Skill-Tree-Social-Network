import jwt, { type SignOptions } from 'jsonwebtoken';
import { NextRequest } from 'next/server';

import { getJwtSecret } from '@/lib/jwt';

export type AuthPayload = {
  id: number;
  username: string;
  email: string;
};

export function signToken(user: AuthPayload) {
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

  return jwt.sign(user, getJwtSecret(), {
    expiresIn
  });
}

export function readBearerToken(request: NextRequest) {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

export function requireAuth(request: NextRequest) {
  const token = readBearerToken(request);
  if (!token) {
    throw new Error('Unauthorized: No token provided.');
  }

  return jwt.verify(token, getJwtSecret()) as AuthPayload;
}

export function optionalAuth(request: NextRequest) {
  try {
    const token = readBearerToken(request);
    if (!token) return null;
    return jwt.verify(token, getJwtSecret()) as AuthPayload;
  } catch {
    return null;
  }
}
