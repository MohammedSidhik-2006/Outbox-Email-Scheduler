import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    oauthState: string;
    slackOauthState?: string;
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: import('@prisma/client').User;
  }
}
