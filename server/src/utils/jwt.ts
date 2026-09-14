import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { CookieOptions } from 'express';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'mailradar_jwt_access_secret_secure_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'mailradar_jwt_refresh_secret_secure_key_2026';

export interface TokenPayload {
  userId: string;
  email: string;
  name?: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

const isProduction = process.env.NODE_ENV === 'production';

export const ACCESS_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: '/',
};

export const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth',
};

export const CSRF_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: false, // Accessible to client JS for double-submit header
  secure: isProduction,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};
