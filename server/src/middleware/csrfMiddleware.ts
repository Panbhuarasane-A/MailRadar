import { Request, Response, NextFunction } from 'express';
import { generateCSRFToken, CSRF_COOKIE_OPTIONS } from '../utils/jwt';

// Exempt paths from CSRF verification (external webhooks and OAuth redirects)
const EXEMPT_PATHS = [
  '/api/telegram/webhook',
  '/api/auth/google/callback',
];

/**
 * Modern Double-Submit Cookie CSRF Protection Middleware
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // 1. Ensure client has a CSRF cookie for subsequent requests
  let csrfToken = req.cookies?.['XSRF-TOKEN'];
  if (!csrfToken) {
    csrfToken = generateCSRFToken();
    res.cookie('XSRF-TOKEN', csrfToken, CSRF_COOKIE_OPTIONS);
  }
  res.locals.csrfToken = csrfToken;
  (req as any).csrfToken = csrfToken;

  // 2. Safe HTTP methods (GET, HEAD, OPTIONS) do not require CSRF validation
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method.toUpperCase())) {
    return next();
  }

  // 3. Check for exempted routes (e.g. third-party webhooks)
  if (EXEMPT_PATHS.some((path) => req.path.startsWith(path))) {
    return next();
  }

  // 4. Validate CSRF token on state-changing requests (POST, PUT, PATCH, DELETE)
  const incomingHeader = (
    req.headers['x-xsrf-token'] ||
    req.headers['x-csrf-token'] ||
    req.headers['xsrf-token']
  ) as string | undefined;

  if (!incomingHeader || !csrfToken || incomingHeader !== csrfToken) {
    // In local development, if header x-user-email is provided for tooling/scripts without browser cookies, allow with warning
    if (process.env.NODE_ENV !== 'production' && req.headers['x-user-email']) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'CSRF token missing or invalid. Please refresh the page.',
      code: 'CSRF_INVALID',
    });
  }

  return next();
}
