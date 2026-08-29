import { Router } from 'express';
import { SlackIntegrationController } from '../controllers/SlackIntegrationController';
import { requireAuth } from '../middleware/requireAuth';

export const slackRoutes = Router();

slackRoutes.get('/connect', requireAuth, SlackIntegrationController.connect);
slackRoutes.get('/callback', requireAuth, SlackIntegrationController.callback);
slackRoutes.get('/status', requireAuth, SlackIntegrationController.status);
slackRoutes.post('/disconnect', requireAuth, SlackIntegrationController.disconnect);
