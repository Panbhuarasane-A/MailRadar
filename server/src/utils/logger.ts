import pino from 'pino';
import pinoHttp from 'pino-http';

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

export const logger = pino({
  level: logLevel,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-user-email"]',
      'password',
      'oauthTokens',
      'accessToken',
      'refreshToken',
      'token',
      'secret',
      '*.password',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
  transport: !isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

export const httpLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => {
      // Don't clutter logs with health checks or static asset requests
      return req.url?.startsWith('/health') || req.url?.includes('.') || false;
    },
  },
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});
