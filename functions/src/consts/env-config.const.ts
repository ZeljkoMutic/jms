import * as functions from 'firebase-functions';

export const ENV_CONFIG = functions.config()[process.env.NODE_ENV === 'production' ? 'prod' : 'dev'] as {
  sendgrid?: {
    key: string;
  };
  email?: {
    name: string;
    email: string;
  },

  /**
   * Secret for email token HMAC
   */
  esecret: string;
  gh?: {
    token: string;
  }
};
