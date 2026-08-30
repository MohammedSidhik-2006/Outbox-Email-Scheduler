import { Router } from 'express';
import { SendersController } from '../controllers/SendersController';
import { requireAuth } from '../middleware/requireAuth';

export const sendersRoutes = Router();

// All routes require authentication
sendersRoutes.use(requireAuth);

// Create or get sender
sendersRoutes.post('/', SendersController.createOrGetSender);

// Get all senders
sendersRoutes.get('/', SendersController.getSenders);

// Delete sender
sendersRoutes.delete('/:id', SendersController.deleteSender);
