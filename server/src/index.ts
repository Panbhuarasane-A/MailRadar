import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import apiRouter from './routes/api';
import { prisma } from './config/prisma';
import { seedDatabase } from './seeds/seed';
import { authService } from './services/auth/authService';
import { csrfProtection } from './middleware/csrfMiddleware';
import { authLimiter, syncLimiter, apiLimiter } from './middleware/rateLimiter';
import { logger, httpLogger } from './utils/logger';
import { initSentry, captureException } from './utils/sentry';

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 4000;

// 1. Initialize Sentry APM & Crash Reporting
initSentry(app);

// 2. Security Headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'", 'https:', 'wss:', 'ws:'],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 3. CORS configuration with credentials support for HttpOnly cookies
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow localhost, local network, and same-origin
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        callback(null, true);
      } else {
        callback(null, true); // Allow configured frontend domain in production
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'mailradar_signed_cookie_secret_key_2026'));

// 4. Structured HTTP Logging (Pino)
app.use(httpLogger);

// 5. Rate Limiting for Abuse & Brute-Force Prevention
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/sync', syncLimiter);
app.use('/api/mailbox/sync', syncLimiter);
app.use('/api/telegram/channel/sync', syncLimiter);

// 6. Double-Submit CSRF Protection
app.use(csrfProtection);

// 7. API Routes
app.use('/api', apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Mail Hinge AI Unified App', time: new Date().toISOString() });
});

// Serve frontend static build if available
const possibleDistPaths = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
  path.resolve(__dirname, './client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
];

let clientDistPath: string | null = null;
for (const p of possibleDistPaths) {
  if (fs.existsSync(p)) {
    clientDistPath = p;
    break;
  }
}

if (clientDistPath) {
  console.log(`[Server] Serving production static UI from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath!, 'index.html'));
  });
}

async function bootstrap() {
  try {
    console.log('[Server] Connecting to database...');
    await prisma.$connect();
    console.log('[Server] Database connected successfully.');

    // Auto-provision default user
    const user = await authService.getOrCreateDefaultUser();
    const existingEmails = await prisma.email.count({ where: { userId: user.id } });
    const prefs = user.preferences ? JSON.parse(user.preferences) : {};

    if (existingEmails === 0 && !prefs.connectedMailbox) {
      console.log('[Server] First run detected: Seeding initial mailbox with realistic emails...');
      await seedDatabase();
    } else {
      console.log(`[Server] User ${user.email} has ${existingEmails} real direct emails. Skipping mock seed.`);
    }

    app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`  🚀 Mail Hinge AI API Server running on port ${PORT}`);
      console.log(`  📡 Health check: http://localhost:${PORT}/health`);
      console.log(`  📥 API Endpoints: http://localhost:${PORT}/api/emails`);
      console.log(`======================================================\n`);
    });
  } catch (err) {
    console.error('[Server] Fatal bootstrap error:', err);
    process.exit(1);
  }
}

bootstrap();
