import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { logger } from '../lib/logger';

export class AuthService {
  private static oauthClient = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_CALLBACK_URL
  );

  public static getGoogleAuthUrl(state: string): string {
    return this.oauthClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state,
      prompt: 'consent' // ensures refresh token if needed later, but standard for full login
    });
  }

  public static async handleGoogleCallback(code: string) {
    try {
      const { tokens } = await this.oauthClient.getToken(code);
      this.oauthClient.setCredentials(tokens);

      // Verify the ID token instead of just parsing, for security
      if (!tokens.id_token) {
        throw new Error('No id_token returned from Google');
      }

      const ticket = await this.oauthClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      
      if (!payload) {
        throw new Error('Invalid Google identity payload');
      }

      if (!payload.email_verified) {
        logger.warn({ email: payload.email }, 'Google email is not verified');
        throw new Error('Google email is not verified');
      }

      if (!payload.email || !payload.sub) {
        throw new Error('Incomplete Google profile returned');
      }

      return this.upsertUserAndAccount(
        payload.sub,
        payload.email,
        payload.name || null,
        payload.picture || null
      );
    } catch (error) {
      logger.error({ err: error }, 'Google callback handling failed');
      throw error;
    }
  }

  private static async upsertUserAndAccount(
    providerId: string,
    email: string,
    name: string | null,
    avatarUrl: string | null
  ) {
    // We must securely map Google sub to a user without race conditions.
    // We use a database transaction.
    return await prisma.$transaction(async (tx) => {
      // 1. Try to find existing OAuthAccount
      let account = await tx.oAuthAccount.findUnique({
        where: {
          provider_providerId: {
            provider: 'google',
            providerId,
          }
        },
        include: { user: true }
      });

      if (account) {
        // Update user profile just in case it changed
        const user = await tx.user.update({
          where: { id: account.userId },
          data: { name, avatarUrl }
        });
        return user;
      }

      // 2. If no account, maybe the user exists by email?
      // Since it's verified by Google, we can link it securely, or create a new one.
      let user = await tx.user.findUnique({ where: { email } });

      if (user) {
        // Link new account to existing user, update profile
        user = await tx.user.update({
          where: { id: user.id },
          data: { name, avatarUrl }
        });
      } else {
        // Create new user
        user = await tx.user.create({
          data: {
            email,
            name,
            avatarUrl,
          }
        });
      }

      // 3. Create the OAuthAccount
      await tx.oAuthAccount.create({
        data: {
          userId: user.id,
          provider: 'google',
          providerId,
        }
      });

      return user;
    });
  }
}
