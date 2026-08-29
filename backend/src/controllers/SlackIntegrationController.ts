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
      
      logger.info({ 
        event: 'SLACK_AUTH_START', 
        userId: req.user!.id,
        sessionId: req.sessionID
      }, 'Starting Slack OAuth');
      
      const url = SlackIntegrationService.getAuthUrl(state);
      
      // Save session before redirect
      req.session.save((err) => {
        if (err) {
          logger.error({ err, userId: req.user!.id }, 'Session save failed but redirecting');
        }
        res.redirect(url);
      });
    } catch (error) {
      logger.error({ err: error, userId: req.user!.id }, 'Slack Auth init failed');
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public static async callback(req: Request, res: Response) {
    try {
      const { code, state, error } = req.query;
      
      logger.info({ 
        sessionId: req.sessionID,
        hasSlackState: !!req.session.slackOauthState,
        userId: req.user!.id
      }, 'Slack callback received');

      if (error) {
        logger.warn({ error, event: 'SLACK_AUTH_FAILURE', userId: req.user!.id }, 'Slack rejected auth');
        return res.redirect(`${env.FRONTEND_URL}/dashboard?slack_error=oauth_rejected`);
      }

      if (!code || typeof code !== 'string') {
        logger.warn({ event: 'SLACK_AUTH_FAILURE', userId: req.user!.id }, 'No auth code');
        return res.status(400).send('Missing authorization code');
      }

      const storedState = req.session.slackOauthState;
      const providedState = state as string;
      
      if (!providedState || !storedState || providedState !== storedState) {
        logger.warn({ 
          event: 'SLACK_AUTH_FAILURE',
          match: storedState === providedState,
          userId: req.user!.id
        }, 'State mismatch - possible CSRF');
        return res.status(400).send('Invalid state parameter. Session may have expired.');
      }

      delete req.session.slackOauthState;

      await SlackIntegrationService.handleCallback(code, req.user!.id);
      logger.info({ event: 'SLACK_AUTH_SUCCESS', userId: req.user!.id }, 'Slack connected');
      
      res.redirect(`${env.FRONTEND_URL}/dashboard?slack_success=1`);

    } catch (error: any) {
      logger.error({ err: error, event: 'SLACK_AUTH_FAILURE', userId: req.user!.id }, 'Callback failed');
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
