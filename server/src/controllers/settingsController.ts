import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { authService } from '../services/auth/authService';
import { SENSITIVITY_THRESHOLDS, SensitivityLevel } from '../config/constants';

export class SettingsController {
  public async getSettings(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().length > 0);

      return res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          sensitivity: user.sensitivity,
          sensitivityThresholds: SENSITIVITY_THRESHOLDS[user.sensitivity as SensitivityLevel] || SENSITIVITY_THRESHOLDS.balanced,
          allThresholds: SENSITIVITY_THRESHOLDS,
          hasApiKey,
          preferences: user.preferences ? JSON.parse(user.preferences) : {},
        },
      });
    } catch (err: any) {
      console.error('[SettingsController.getSettings]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public async updateSensitivity(req: Request, res: Response) {
    try {
      const user = await authService.getUserFromRequest(req);
      const { sensitivity } = req.body;

      if (!['conservative', 'balanced', 'aggressive'].includes(sensitivity)) {
        return res.status(400).json({ success: false, error: 'Invalid sensitivity level' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { sensitivity },
      });

      // Optionally re-tier existing unread emails based on the new threshold
      const thresholds = SENSITIVITY_THRESHOLDS[sensitivity as SensitivityLevel];
      const emails = await prisma.email.findMany({
        where: { userId: user.id, status: { in: ['unread', 'read'] } },
      });

      for (const email of emails) {
        let newTier = 'low';
        if (email.priorityScore >= thresholds.hotspot) newTier = 'hotspot';
        else if (email.priorityScore >= thresholds.important) newTier = 'important';
        else if (email.priorityScore >= thresholds.normal) newTier = 'normal';
        else newTier = 'low';

        if (newTier !== email.priorityTier) {
          await prisma.email.update({
            where: { id: email.id },
            data: { priorityTier: newTier },
          });
        }
      }

      return res.json({
        success: true,
        data: {
          sensitivity: updatedUser.sensitivity,
          thresholds,
        },
      });
    } catch (err: any) {
      console.error('[SettingsController.updateSensitivity]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const settingsController = new SettingsController();
