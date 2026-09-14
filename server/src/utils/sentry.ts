import * as Sentry from '@sentry/node';
import { Express } from 'express';
import { logger } from './logger';

export function initSentry(app?: Express) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || dsn.trim() === '') {
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    });
    logger.info('[Sentry] Crash reporting and APM initialized.');
  } catch (err) {
    logger.warn({ err }, '[Sentry] Failed to initialize Sentry');
  }
}

export function captureException(err: any, context?: any) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, { extra: context });
  }
  logger.error({ err, ...context }, '[Exception Captured]');
}
