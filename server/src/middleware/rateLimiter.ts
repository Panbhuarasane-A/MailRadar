import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for Authentication endpoints to prevent brute-force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 login/register attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Rate limiter for heavy sync and scraping endpoints
 */
export const syncLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // max 60 sync operations per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many mailbox/sync requests. Please wait a moment before trying again.',
    code: 'SYNC_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * General API rate limiter for overall service stability
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 400, // max 400 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'API rate limit exceeded. Please slow down your requests.',
    code: 'API_RATE_LIMIT_EXCEEDED',
  },
});
