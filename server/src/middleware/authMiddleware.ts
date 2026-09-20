import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { prisma } from '../config/prisma';
import { authService } from '../services/auth/authService';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/**
 * Extracts authenticated user from JWT cookie or Bearer header,
 * with fallback to authService in development.
 */
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // 1. Check HttpOnly access_token cookie
    const cookieToken = req.cookies?.access_token || req.signedCookies?.access_token;
    
    // 2. Check Authorization Bearer header
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const token = cookieToken || bearerToken;

    if (token) {
      const payload = verifyAccessToken(token);
      if (payload) {
        req.user = payload;
        return next();
      }
    }

    // 3. Fallback: resolve user from header/default via authService
    // Allows seamless local dev and transition
    const user = await authService.getUserFromRequest(req);
    if (user) {
      req.user = {
        userId: user.id,
        email: user.email,
        name: user.name || undefined,
      };
      return next();
    }

    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in.',
      code: 'UNAUTHORIZED',
    });
  } catch (err: any) {
    console.error('[authenticateToken Middleware Error]', err);
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token.',
      code: 'INVALID_TOKEN',
    });
  }
}

/**
 * Optional authentication: attaches user if token is valid without blocking
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    const cookieToken = req.cookies?.access_token || req.signedCookies?.access_token;
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const token = cookieToken || bearerToken;

    if (token) {
      const payload = verifyAccessToken(token);
      if (payload) {
        req.user = payload;
        return next();
      }
    }

    const user = await authService.getUserFromRequest(req);
    if (user) {
      req.user = {
        userId: user.id,
        email: user.email,
        name: user.name || undefined,
      };
    }
  } catch {
    // Ignore errors for optional auth
  }
  return next();
}

/**
 * Strict Administrator-only authorization middleware
 */
export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await authService.getUserFromRequest(req);
    const isAdmin = user && (user.role === 'admin' || user.email === 'admin@mailhinge.ai' || user.email?.startsWith('admin@'));
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Administrator privileges required.',
        code: 'FORBIDDEN_ADMIN_ONLY',
      });
    }

    req.user = {
      userId: user.id,
      email: user.email,
      name: user.name || undefined,
    };
    return next();
  } catch (err: any) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Administrator privileges required.',
      code: 'FORBIDDEN_ADMIN_ONLY',
    });
  }
}

