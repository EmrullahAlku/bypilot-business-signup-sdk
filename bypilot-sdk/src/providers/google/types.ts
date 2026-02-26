import type { ProviderConfig } from '../../core';

/**
 * Format 2: Grouped permissions by base URL (the only format GoogleProvider implements)
 *
 * Keys are base URLs, values are scope names relative to that base.
 * Empty string key '' means absolute scopes (no base URL appended).
 *
 * @example
 * {
 *   '': ['openid', 'email'],                             // → 'openid email'
 *   'https://www.googleapis.com/auth': [
 *     'gmail.readonly',                                  // → .../auth/gmail.readonly
 *     'userinfo.email',                                  // → .../auth/userinfo.email
 *     'business.manage',                                 // → .../auth/business.manage
 *   ],
 * }
 */
export type GroupedPermissions = Record<string, string[]>;

/**
 * Google OAuth 2.0 provider configuration
 *
 * Uses Format 2 (grouped by base URL) for permissions.
 * See GroupedPermissions for format details.
 */
export interface GoogleProviderConfig extends ProviderConfig {
  /**
   * Google OAuth Client ID
   */
  clientId: string;

  /**
   * Redirect URI (must match Google Cloud Console authorized URIs)
   */
  redirectUri: string;

  /**
   * Permissions in grouped Format 2.
   * Keys are base URLs, values are scope names relative to that base.
   * Empty string '' key = absolute scopes (openid, email, profile).
   */
  permissions: GroupedPermissions;

  /**
   * Token access type.
   * 'offline' returns a refresh_token (recommended).
   * @default 'offline'
   */
  accessType?: 'online' | 'offline';

  /**
   * Force the consent screen to appear.
   * @default 'consent'
   */
  prompt?: 'none' | 'consent' | 'select_account';
}

/**
 * Google session info after successful authentication
 */
export interface GoogleSessionInfo {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
  idToken?: string;
}

/**
 * Google token exchange response
 */
export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}
