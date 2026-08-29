import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { requireAuth } from '../middleware/requireAuth';

export const authRoutes = Router();

authRoutes.get('/google', AuthController.googleAuth);
authRoutes.get('/google/callback', AuthController.googleCallback);
authRoutes.get('/me', requireAuth, AuthController.getMe);
authRoutes.post('/logout', requireAuth, AuthController.logout);
