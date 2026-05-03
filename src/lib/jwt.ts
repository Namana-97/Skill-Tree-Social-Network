import jwt, { type SignOptions } from 'jsonwebtoken';

export function getJwtSecret() {
  return process.env.JWT_SECRET || 'dev_secret_key';
}

export function generateToken<T extends object>(
  payload: T,
  expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn']
) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
}

export function verifyToken<T = jwt.JwtPayload | string>(token: string) {
  return jwt.verify(token, getJwtSecret()) as T;
}
