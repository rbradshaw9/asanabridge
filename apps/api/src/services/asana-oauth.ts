import axios from 'axios';
import { oauthLogger } from '../config/logger';
import { loadEnv } from '../config/env';

const ASANA_TOKEN_URL = 'https://app.asana.com/-/oauth_token';
const ASANA_AUTH_URL = 'https://app.asana.com/-/oauth_authorize';

export interface AsanaTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}

export class AsanaOAuth {
  /**
   * Build the Asana OAuth authorization URL.
   * @param state — opaque value to prevent CSRF, typically the user ID
   */
  static getAuthorizationUrl(state: string): string {
    const env = loadEnv();

    if (!env.ASANA_CLIENT_ID || !env.ASANA_REDIRECT_URI) {
      throw new Error('ASANA_CLIENT_ID and ASANA_REDIRECT_URI must be configured');
    }

    const params = new URLSearchParams({
      client_id: env.ASANA_CLIENT_ID,
      redirect_uri: env.ASANA_REDIRECT_URI,
      response_type: 'code',
      state,
    });

    return `${ASANA_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange an authorization code for an access + refresh token.
   */
  static async exchangeCode(code: string): Promise<AsanaTokenResponse> {
    const env = loadEnv();

    if (!env.ASANA_CLIENT_ID || !env.ASANA_CLIENT_SECRET || !env.ASANA_REDIRECT_URI) {
      throw new Error('Asana OAuth credentials not configured');
    }

    const res = await axios.post<AsanaTokenResponse>(
      ASANA_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: env.ASANA_CLIENT_ID,
        client_secret: env.ASANA_CLIENT_SECRET,
        redirect_uri: env.ASANA_REDIRECT_URI,
        code,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    oauthLogger.info('Asana code exchanged successfully');
    return res.data;
  }

  /**
   * Refresh an expired access token.
   */
  static async refreshAccessToken(refreshToken: string): Promise<AsanaTokenResponse> {
    const env = loadEnv();

    if (!env.ASANA_CLIENT_ID || !env.ASANA_CLIENT_SECRET) {
      throw new Error('Asana OAuth credentials not configured');
    }

    const res = await axios.post<AsanaTokenResponse>(
      ASANA_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: env.ASANA_CLIENT_ID,
        client_secret: env.ASANA_CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    oauthLogger.info('Asana token refreshed successfully');
    return res.data;
  }

  /**
   * Get a valid (possibly refreshed) access token for a user.
   * Automatically refreshes if the token is within 5 minutes of expiry.
   */
  static async getValidToken(userId: string): Promise<string> {
    const { prisma } = await import('../config/database');

    const tokenRecord = await prisma.asanaToken.findUnique({ where: { userId } });

    if (!tokenRecord) {
      throw new Error('No Asana token found. Please connect your Asana account.');
    }

    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    const needsRefresh =
      tokenRecord.expiresAt && tokenRecord.expiresAt < fiveMinutesFromNow;

    if (needsRefresh && tokenRecord.refreshToken) {
      oauthLogger.info('Refreshing Asana access token', { userId });
      const refreshed = await AsanaOAuth.refreshAccessToken(tokenRecord.refreshToken);

      await prisma.asanaToken.update({
        where: { userId },
        data: {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token ?? tokenRecord.refreshToken,
          expiresAt: refreshed.expires_in
            ? new Date(Date.now() + refreshed.expires_in * 1000)
            : null,
        },
      });

      return refreshed.access_token;
    }

    return tokenRecord.accessToken;
  }
}
