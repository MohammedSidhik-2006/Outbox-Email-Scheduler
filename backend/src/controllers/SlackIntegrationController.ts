import { Request, Response } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { SlackIntegrationService } from '../services/SlackIntegrationService';

export class SlackIntegrationController {
  public static connect(req: Request, res: Response) {
    try {
      const state = crypto.randomBytes(32).toString('hex');
      req.session.slackOauthState = state;
      
      const url = SlackIntegrationService.getAuthUrl(state);
      logger.info({ event: 'SLACK_AUTH_START', userId: req.user!.id }, 'Starting Slack OAuth flow');
      
      // Save session with timeout
      const savePromise = new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('Session save timeout')), 5000);
        req.session.save((err) => {
          clearTimeout(timeoutId);
          if (err) reject(err);
          else resolve();
        });
      });
      
      savePromise
        .then(() => res.redirect(url))
        .catch((err) => {
          logger.warn({ err, userId: req.user!.id }, 'Session save failed but redirecting anyway');
          res.redirect(url);
        });
    } catch (error) {
      logger.error({ err: error, userId: req.user!.id }, 'Failed to start Slack Auth');
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public static async callback(req: Request, res: Response) {
    try {
      const { code, state, error } = req.query;

      if (error) {
        logger.warn({ error, event: 'SLACK_AUTH_FAILURE', userId: req.user!.id }, 'Slack returned an error');
        return res.redirect(`${env.FRONTEND_URL}/dashboard?slack_error=oauth_rejected`);
      }

      if (!code || typeof code !== 'string') {
        logger.warn({ event: 'SLACK_AUTH_FAILURE', userId: req.user!.id }, 'Missing authorization code');
        return res.status(400).send('Missing authorization code');
      }

      if (!state || typeof state !== 'string' || state !== req.session.slackOauthState) {
        logger.warn({ event: 'SLACK_AUTH_FAILURE', expectedState: req.session.slackOauthState, providedState: state, userId: req.user!.id }, 'Invalid or missing Slack OAuth state');
        return res.status(400).send('Invalid state parameter. Possible CSRF attack.');
      }

      req.session.slackOauthState = undefined; // Single-use state

      await SlackIntegrationService.handleCallback(code, req.user!.id);
      logger.info({ event: 'SLACK_AUTH_SUCCESS', userId: req.user!.id }, 'Slack connected successfully');
      
      res.redirect(`${env.FRONTEND_URL}/dashboard?slack_success=1`);

    } catch (error: any) {
      logger.error({ err: error, event: 'SLACK_AUTH_FAILURE', userId: req.user!.id }, 'Callback processing failed');
      res.redirect(`${env.FRONTEND_URL}/dashboard?slack_error=authentication_failed`);
    }
  }

  public static async status(req: Request, res: Response) {
    try {
      const status = await SlackIntegrationService.getStatus(req.user!.id);
      res.json(status);
    } catch (error) {
      logger.error({ err: error, userId: req.user!.id }, 'Failed to fetch Slack status');
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public static async disconnect(req: Request, res: Response) {
    try {
      await SlackIntegrationService.disconnect(req.user!.id);
      logger.info({ event: 'SLACK_DISCONNECTED', userId: req.user!.id }, 'Slack disconnected successfully');
      res.json({ success: true, message: 'Slack disconnected' });
    } catch (error) {
      logger.error({ err: error, userId: req.user!.id }, 'Failed to disconnect Slack');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
