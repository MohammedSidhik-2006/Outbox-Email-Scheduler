import { Router } from 'express';
import { EmailController } from '../controllers/EmailController';
import { CampaignController } from '../controllers/CampaignController';
import { requireAuth } from '../middleware/requireAuth';
import { validate } from '../middleware/validate';
import { scheduleEmailSchema } from '../validators/scheduleValidator';

export const emailRoutes = Router();

// Phase 1 API
emailRoutes.post('/schedule', requireAuth, validate(scheduleEmailSchema), EmailController.schedule);

// Phase 2C Bulk API
emailRoutes.post('/campaigns', requireAuth, CampaignController.scheduleBulk);
emailRoutes.get('/scheduled', requireAuth, CampaignController.getScheduledEmails);
emailRoutes.get('/sent', requireAuth, CampaignController.getSentEmails);
