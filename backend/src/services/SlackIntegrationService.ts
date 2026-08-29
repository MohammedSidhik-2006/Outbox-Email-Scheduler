import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { redis } from '../lib/redis';
import { EncryptionService } from './EncryptionService';

export class SlackIntegrationService {
  private static readonly OAUTH_URL = 'https://slack.com/oauth/v2/authorize';
  private static readonly API_URL = 'https://slack.com/api';

  public static getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.SLACK_CLIENT_ID,
      scope: 'chat:write',
      redirect_uri: env.SLACK_CALLBACK_URL,
      state: state,
    });
    return `${this.OAUTH_URL}?${params.toString()}`;
  }

  public static async handleCallback(code: string, userId: string): Promise<void> {
    try {
      // Exchange code for token
      const response = await fetch(`${this.API_URL}/oauth.v2.access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env.SLACK_CLIENT_ID,
          client_secret: env.SLACK_CLIENT_SECRET,
          code,
          redirect_uri: env.SLACK_CALLBACK_URL,
        }),
      });

      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(`Slack OAuth error: ${data.error}`);
      }

      // We need to identify the destination.
      // Slack returns authed_user.id for user tokens, and access_token for bot/user.
      // We will send notifications from the bot to the authed_user's channel.
      const slackUserId = data.authed_user?.id;
      const teamName = data.team?.name;
      const accessToken = data.access_token; // The bot or user access token

      if (!slackUserId || !accessToken) {
        throw new Error('Slack OAuth response missing required fields');
      }

      const encryptedToken = EncryptionService.encrypt(accessToken);

      await prisma.oAuthAccount.upsert({
        where: {
          userId_provider: {
            userId: userId,
            provider: 'slack'
          }
        },
        update: {
          providerId: slackUserId,
          accessToken: encryptedToken,
          teamName: teamName
        },
        create: {
          userId: userId,
          provider: 'slack',
          providerId: slackUserId,
          accessToken: encryptedToken,
          teamName: teamName
        }
      });
      
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to handle Slack callback');
      throw error;
    }
  }

  public static async getStatus(userId: string) {
    const account = await prisma.oAuthAccount.findUnique({
      where: { userId_provider: { userId, provider: 'slack' } }
    });

    if (!account) return { connected: false };

    return {
      connected: true,
      teamName: account.teamName,
      connectedAt: account.updatedAt
    };
  }

  public static async disconnect(userId: string): Promise<void> {
    try {
      await prisma.oAuthAccount.delete({
        where: { userId_provider: { userId, provider: 'slack' } }
      });
    } catch (error: any) {
      // Ignore if record to delete does not exist
      if (error.code === 'P2025') return;
      throw error;
    }
  }

  public static async notifyHourlyLimitReached(userId: string, senderEmail: string, limit: number): Promise<void> {
    const hourWindow = new Date().toISOString().substring(0, 13); // e.g. "2026-08-29T09"
    const lockKey = `slack:rate-limit-notified:${senderEmail}:${hourWindow}`;

    // 1. Acquire Redis lock
    const lock = await redis.set(lockKey, '1', 'EX', 3600, 'NX');
    if (!lock) {
      // Another worker is already handling the notification for this hour
      return;
    }

    try {
      // 2. Fetch Slack connection
      const account = await prisma.oAuthAccount.findUnique({
        where: { userId_provider: { userId, provider: 'slack' } }
      });

      if (!account || !account.accessToken) {
        // Not connected, release lock so if they connect later in the hour it can trigger
        await redis.del(lockKey);
        return;
      }

      const decryptedToken = EncryptionService.decrypt(account.accessToken);
      const destinationId = account.providerId; // User ID who authenticated
      
      const message = `Email sending paused for ${senderEmail} because the hourly limit of ${limit} emails was reached. Queued emails will resume in the next available window.`;

      // 3. Send Slack message
      const response = await fetch(`${this.API_URL}/chat.postMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${decryptedToken}`
        },
        body: JSON.stringify({
          channel: destinationId,
          text: message
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      logger.info({ event: 'SLACK_NOTIFICATION_SENT', senderEmail, hourWindow }, 'Sent hourly limit notification to Slack');

    } catch (error) {
      // 4. On failure, release lock so it can be retried and log error safely without credentials
      await redis.del(lockKey).catch(e => logger.error({ err: e }, 'Failed to release Redis lock for Slack notification'));
      logger.error({ err: error, senderEmail }, 'Slack notification failed. Job deferral remains safe.');
      // NEVER rethrow here. The worker MUST proceed with deferring the job.
    }
  }
}
