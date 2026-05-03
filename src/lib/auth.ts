import bcrypt from 'bcryptjs';
import { type SignOptions } from 'jsonwebtoken';
import { NextRequest } from 'next/server';

import { generateToken, verifyToken } from '@/lib/jwt';

export type AuthPayload = {
  id: number;
  username: string;
  email: string;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function signToken(user: AuthPayload) {
  const expiresIn = (process.env.JWT_EXPIRES_IN ||
    '7d') as SignOptions['expiresIn'];

  return generateToken(user, expiresIn);
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

  return verifyToken<AuthPayload>(token);
}

export function optionalAuth(request: NextRequest) {
  try {
    const token = readBearerToken(request);
    if (!token) return null;
    return verifyToken<AuthPayload>(token);
  } catch {
    return null;
  }
}
