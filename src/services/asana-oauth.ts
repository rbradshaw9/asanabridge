import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { loadEnv } from '../config/env';
import { logger } from '../config/logger';
import { prisma } from '../config/database';

const env = loadEnv();

export interface AsanaOAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}

export class AsanaOAuth {
  private static readonly AUTH_URL = 'https://app.asana.com/-/oauth_authorize';
  private static readonly TOKEN_URL = 'https://app.asana.com/-/oauth_token';

  static getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: env.ASANA_CLIENT_ID!,
      redirect_uri: env.ASANA_REDIRECT_URI!,
      response_type: 'code',
      state: state || '',
      scope: 'default'
    });

    return `${this.AUTH_URL}?${params.toString()}`;
  }

  static async exchangeCodeForTokens(code: string): Promise<AsanaOAuthTokens> {
    try {
      const response = await axios.post(this.TOKEN_URL, {
        grant_type: 'authorization_code',
        client_id: env.ASANA_CLIENT_ID,
        client_secret: env.ASANA_CLIENT_SECRET,
        redirect_uri: env.ASANA_REDIRECT_URI,
        code
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error: any) {
      logger.error('Asana OAuth token exchange failed', {
        error: error.response?.data || error.message
      });
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  static async refreshAccessToken(refreshToken: string): Promise<AsanaOAuthTokens> {
    try {
      const response = await axios.post(this.TOKEN_URL, {
        grant_type: 'refresh_token',
        client_id: env.ASANA_CLIENT_ID,
        client_secret: env.ASANA_CLIENT_SECRET,
        refresh_token: refreshToken
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error: any) {
      logger.error('Asana token refresh failed', {
        error: error.response?.data || error.message
      });
      throw new Error('Failed to refresh access token');
    }
  }

  static async storeTokensForUser(userId: string, tokens: AsanaOAuthTokens): Promise<void> {
    const expiresAt = tokens.expires_in 
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    await prisma.asanaToken.upsert({
      where: { userId: userId },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        updatedAt: new Date()
      },
      create: {
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt
      }
    });

    logger.info('Asana tokens stored for user', { userId });
  }

  static async getValidTokenForUser(userId: string): Promise<string | null> {
    const tokenRecord = await prisma.asanaToken.findUnique({
      where: { userId }
    });

    if (!tokenRecord) {
      return null;
    }

    // Check if token is expired (with 5-minute buffer)
    if (tokenRecord.expiresAt && tokenRecord.expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
      if (tokenRecord.refreshToken) {
        try {
          const newTokens = await this.refreshAccessToken(tokenRecord.refreshToken);
          await this.storeTokensForUser(userId, newTokens);
          return newTokens.access_token;
        } catch (error) {
          logger.warn('Failed to refresh Asana token for user', { userId });
          return null;
        }
      } else {
        logger.warn('Asana token expired with no refresh token', { userId });
        return null;
      }
    }

    return tokenRecord.accessToken;
  }
}