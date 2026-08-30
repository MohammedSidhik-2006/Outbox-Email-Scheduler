import { Request, Response } from 'express';
import crypto from 'crypto';
import { AuthService } from '../services/AuthService';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { env } from '../config/env';

export class AuthController {
  public static async googleAuth(req: Request, res: Response) {
    try {
      const state = crypto.randomBytes(32).toString('hex');
      req.session.oauthState = state;
      
      logger.info({ 
        event: 'AUTH_GOOGLE_START', 
        sessionId: req.sessionID,
        stateSaved: !!req.session.oauthState
      }, 'Starting Google OAuth flow');
      
      const url = AuthService.getGoogleAuthUrl(state);
      
      // Explicitly save session before redirecting
      req.session.save((err) => {
        if (err) {
          logger.error({ err }, 'Failed to save session');
          return res.status(500).send('Session save failed');
        }
        res.redirect(url);
      });
    } catch (error) {
      logger.error({ err: error }, 'Google Auth init failed');
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

    // Check if user has Slack integration
    const slackAccount = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider: 'slack',
          providerId: req.user.id
        }
      }
    });

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        avatarUrl: req.user.avatarUrl,
        slackConnected: !!slackAccount
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
