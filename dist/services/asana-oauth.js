"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsanaOAuth = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const database_1 = require("../config/database");
const env = (0, env_1.loadEnv)();
class AsanaOAuth {
    static getAuthUrl(state) {
        const params = new URLSearchParams({
            client_id: env.ASANA_CLIENT_ID,
            redirect_uri: env.ASANA_REDIRECT_URI,
            response_type: 'code',
            state: state || '',
            scope: 'default'
        });
        return `${this.AUTH_URL}?${params.toString()}`;
    }
    static async exchangeCodeForTokens(code) {
        try {
            const response = await axios_1.default.post(this.TOKEN_URL, {
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
        }
        catch (error) {
            logger_1.logger.error('Asana OAuth token exchange failed', {
                error: error.response?.data || error.message
            });
            throw new Error('Failed to exchange authorization code for tokens');
        }
    }
    static async refreshAccessToken(refreshToken) {
        try {
            const response = await axios_1.default.post(this.TOKEN_URL, {
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
        }
        catch (error) {
            logger_1.logger.error('Asana token refresh failed', {
                error: error.response?.data || error.message
            });
            throw new Error('Failed to refresh access token');
        }
    }
    static async storeTokensForUser(userId, tokens) {
        const expiresAt = tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000)
            : null;
        await database_1.prisma.asanaToken.upsert({
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
        logger_1.logger.info('Asana tokens stored for user', { userId });
    }
    static async getValidTokenForUser(userId) {
        const tokenRecord = await database_1.prisma.asanaToken.findUnique({
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
                }
                catch (error) {
                    logger_1.logger.warn('Failed to refresh Asana token for user', { userId });
                    return null;
                }
            }
            else {
                logger_1.logger.warn('Asana token expired with no refresh token', { userId });
                return null;
            }
        }
        return tokenRecord.accessToken;
    }
}
exports.AsanaOAuth = AsanaOAuth;
AsanaOAuth.AUTH_URL = 'https://app.asana.com/-/oauth_authorize';
AsanaOAuth.TOKEN_URL = 'https://app.asana.com/-/oauth_token';
