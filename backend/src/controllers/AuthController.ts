import { Request, Response } from 'express';
import crypto from 'crypto';
import { AuthService } from '../services/AuthService';
import { logger } from '../lib/logger';
import { env } from '../config/env';

export class AuthController {
  public static async googleAuth(req: Request, res: Response) {
    try {
      const state = crypto.randomBytes(32).toString('hex');
      req.session.oauthState = state;
      
      const url = AuthService.getGoogleAuthUrl(state);
      logger.info({ event: 'AUTH_GOOGLE_START', sessionId: req.sessionID }, 'Starting Google OAuth');
      
      // Need to save session before redirect to persist state
      const savePromise = new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('Session save timeout')), 5000);
        req.session.save((err) => {
          clearTimeout(timeoutId);
          if (err) reject(err);
          else resolve();
        });
      });
      
      try {
        await savePromise;
        res.redirect(url);
      } catch (saveErr) {
        logger.warn({ err: saveErr }, 'Session save failed, redirecting anyway');
        res.redirect(url);
      }
    } catch (error) {
      logger.error({ err: error }, 'Google Auth failed');
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public static async googleCallback(req: Request, res: Response) {
    try {
      const { code, state, error } = req.query;
      
      logger.info({ 
        sessionId: req.sessionID, 
        hasOauthState: !!req.session.oauthState,
        providedState: state ? (state as string).substring(0, 8) : 'none'
      }, 'Google callback received');

      if (error) {
        logger.warn({ error, event: 'AUTH_GOOGLE_FAILURE' }, 'Google rejected auth');
        return res.redirect(`${env.FRONTEND_URL}/login?error=oauth_rejected`);
      }

      if (!code || typeof code !== 'string') {
        logger.warn({ event: 'AUTH_GOOGLE_FAILURE' }, 'No auth code');
        return res.status(400).send('Missing authorization code');
      }

      // Validate state param to prevent CSRF
      const storedState = req.session.oauthState;
      const providedState = state as string;
      
      if (!providedState || !storedState || providedState !== storedState) {
        logger.warn({ 
          event: 'AUTH_GOOGLE_FAILURE',
          storedStateExists: !!storedState,
          providedStateExists: !!providedState,
          match: storedState === providedState
        }, 'State mismatch - possible CSRF or session not persisted');
        return res.status(400).send('Invalid state parameter. Session may have expired.');
      }

      delete req.session.oauthState;

      const user = await AuthService.handleGoogleCallback(code);
      logger.info({ event: 'AUTH_GOOGLE_SUCCESS', userId: user.id }, 'Google auth succeeded');

      // Regenerate session to prevent fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          logger.error({ err }, 'Failed to regenerate session');
          return res.status(500).send('Session creation failed');
        }

        req.session.userId = user.id;
        res.redirect(`${env.FRONTEND_URL}/dashboard`);
      });

    } catch (error: any) {
      logger.error({ err: error, event: 'AUTH_GOOGLE_FAILURE' }, 'Callback failed');
      res.redirect(`${env.FRONTEND_URL}/login?error=authentication_failed`);
    }
  }

  public static async getMe(req: Request, res: Response) {
    // Requires requireAuth middleware
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        avatarUrl: req.user.avatarUrl,
      }
    });
  }

  public static async logout(req: Request, res: Response) {
    const userId = req.session.userId;
    req.session.destroy((err) => {
      if (err) {
        logger.error({ err }, 'Failed to destroy session');
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.clearCookie('connect.sid');
      logger.info({ event: 'AUTH_LOGOUT', userId }, 'User logged out successfully');
      res.json({ message: 'Logged out' });
    });
  }
}
