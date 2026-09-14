import { Router } from 'express';
import { emailController } from '../controllers/emailController';
import { taskController } from '../controllers/taskController';
import { dailyBriefController } from '../controllers/dailyBriefController';
import { senderController } from '../controllers/senderController';
import { feedbackController } from '../controllers/feedbackController';
import { settingsController } from '../controllers/settingsController';
import { syncController } from '../controllers/syncController';
import { mailboxController } from '../controllers/mailboxController';
import { telegramController } from '../controllers/telegramController';
import { authController } from '../controllers/authController';
import { authService } from '../services/auth/authService';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// User Auth, Account Switching & Preferences
router.get('/auth/me', (req, res) => authController.getMe(req, res));
router.post('/auth/login', (req, res) => authController.login(req, res));
router.post('/auth/register', (req, res) => authController.register(req, res));
router.post('/auth/refresh', (req, res) => authController.refreshToken(req, res));
router.post('/auth/logout', (req, res) => authController.logout(req, res));
router.get('/auth/csrf', (req, res) => authController.getCSRFToken(req, res));
router.get('/auth/users', (req, res) => authController.getUsers(req, res));
router.patch('/auth/preferences', authenticateToken, (req, res) => authController.updatePreferences(req, res));
router.patch('/auth/profile', authenticateToken, (req, res) => authController.updateProfile(req, res));
router.delete('/auth/account', authenticateToken, (req, res) => authController.deleteAccount(req, res));
router.post('/auth/sync-all', authenticateToken, (req, res) => authController.syncAllForUser(req, res));

// Google OAuth 2.0 & Direct Gmail API Synchronization
router.get('/auth/google/url', (req, res) => authController.getGoogleAuthUrl(req, res));
router.post('/auth/google/configure', authenticateToken, (req, res) => authController.configureGoogleOAuth(req, res));
router.get('/auth/google/callback', (req, res) => authController.handleGoogleCallback(req, res));
router.post('/auth/google/sync', authenticateToken, (req, res) => authController.syncGmailOAuth(req, res));

// Telegram Job Channel Live Scraper & Ingestion
router.get('/telegram/config', (req, res) => telegramController.getConfig(req, res));
router.get('/telegram/channels', (req, res) => telegramController.getSavedChannels(req, res));
router.post('/telegram/channel/sync', (req, res) => telegramController.syncChannel(req, res));
router.post('/telegram/channel/sync-all', (req, res) => telegramController.syncAllSaved(req, res));
router.delete('/telegram/channel', (req, res) => telegramController.removeChannel(req, res));
router.post('/telegram/crawl-deadline', (req, res) => telegramController.crawlDeadline(req, res));
router.post('/telegram/resolve-link', (req, res) => telegramController.resolveLink(req, res));
router.post('/telegram/verify-all', (req, res) => telegramController.verifyAllJobs(req, res));
router.post('/telegram/ingest', (req, res) => telegramController.ingestJobPost(req, res));
router.post('/telegram/webhook', (req, res) => telegramController.handleWebhook(req, res));

// Real Mailbox Integration (Gmail, Outlook, IMAP)
router.get('/mailbox/status', (req, res) => mailboxController.getStatus(req, res));
router.post('/mailbox/test', (req, res) => mailboxController.testConnection(req, res));
router.post('/mailbox/sync', (req, res) => mailboxController.syncRealMailbox(req, res));

// Emails
router.get('/emails', (req, res) => emailController.getEmails(req, res));
router.get('/emails/:id', (req, res) => emailController.getEmailById(req, res));
router.patch('/emails/:id/status', (req, res) => emailController.updateEmailStatus(req, res));
router.patch('/emails/:id/category', (req, res) => emailController.updateEmailCategory(req, res));
router.post('/emails/:id/snooze', (req, res) => emailController.snoozeEmail(req, res));
router.post('/emails/:id/unsnooze', (req, res) => emailController.unsnoozeEmail(req, res));

// Tasks (Action Center)
router.get('/tasks', (req, res) => taskController.getTasks(req, res));
router.post('/tasks', (req, res) => taskController.createTask(req, res));
router.patch('/tasks/:id/status', (req, res) => taskController.updateTaskStatus(req, res));
router.patch('/tasks/:id', (req, res) => taskController.updateTask(req, res));
router.delete('/tasks/:id', (req, res) => taskController.deleteTask(req, res));

// Daily Brief
router.get('/daily-brief', (req, res) => dailyBriefController.getDailyBrief(req, res));

// Senders & VIP
router.get('/senders', (req, res) => senderController.getSenders(req, res));
router.post('/senders/vip', (req, res) => senderController.toggleVip(req, res));

// Feedback Loop
router.post('/feedback', (req, res) => feedbackController.submitFeedback(req, res));

// Settings & Sensitivity
router.get('/settings', (req, res) => settingsController.getSettings(req, res));
router.patch('/settings/sensitivity', (req, res) => settingsController.updateSensitivity(req, res));

// Sync & Ingestion Simulation
router.get('/sync/presets', (req, res) => syncController.getPresets(req, res));
router.post('/sync/simulate', (req, res) => syncController.simulateEmail(req, res));
router.post('/sync/trigger', (req, res) => syncController.triggerSync(req, res));

// Auth & Integration status
router.get('/auth/providers', (req, res) => {
  res.json({
    success: true,
    data: {
      gmail: {
        connected: false,
        authUrl: authService.getGmailAuthUrl(),
      },
      outlook: {
        connected: false,
        authUrl: authService.getOutlookAuthUrl(),
      },
      simulation: {
        connected: true,
        mode: 'active',
      },
    },
  });
});

export default router;
