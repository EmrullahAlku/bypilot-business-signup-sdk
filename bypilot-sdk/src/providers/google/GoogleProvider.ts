import { BaseProvider } from '../BaseProvider';
import type { AuthResult } from '../../core';
import type {
  GoogleProviderConfig,
  GoogleSessionInfo,
  GroupedPermissions
} from './types';

/**
 * Google OAuth 2.0 Provider
 *
 * Implements standard OAuth 2.0 authorization code flow.
 * Uses Format 2 (grouped by base URL) for permission configuration.
 *
 * @example
 * ```typescript
 * const google = new GoogleProvider({
 *   clientId: 'YOUR_GOOGLE_CLIENT_ID',
 *   redirectUri: 'https://yoursite.com/api/connect/google',
 *   permissions: {
 *     'https://www.googleapis.com/auth': [
 *       'gmail.readonly',
 *       'userinfo.email',
 *       'userinfo.profile',
 *       'business.manage',
 *     ],
 *   },
 * });
 *
 * google.on('auth:success', (result) => {
 *   console.log('Access token:', result.token?.code);
 * });
 *
 * const result = await google.loginWithPopup();
 * ```
 */
export class GoogleProvider extends BaseProvider {
  readonly name = 'google';
  protected readonly authorizationEndpoint =
    'https://accounts.google.com/o/oauth2/v2/auth';

  private googleConfig: GoogleProviderConfig;
  private lastSessionInfo: GoogleSessionInfo | null = null;

  constructor(config: GoogleProviderConfig) {
    super(config);
    this.googleConfig = config;
  }

  /**
   * Resolve Format 2 (grouped) permissions to a space-separated scope string.
   *
   * Rules:
   * - Empty string key '' → values are absolute scopes, used as-is
   * - Non-empty key → each value is joined as `${baseUrl}/${scopeName}`
   * - Values already starting with 'https://' are used as-is regardless of key
   *
   * @example
   * Input:  { '': ['openid'], 'https://www.googleapis.com/auth': ['gmail.readonly'] }
   * Output: 'openid https://www.googleapis.com/auth/gmail.readonly'
   */
  resolvePermissions(permissions: GroupedPermissions = this.googleConfig.permissions): string {
    const scopes: string[] = [];

    for (const [baseUrl, scopeNames] of Object.entries(permissions)) {
      for (const scope of scopeNames) {
        if (!baseUrl || scope.startsWith('https://') || scope.startsWith('http://')) {
          scopes.push(scope);
        } else {
          scopes.push(`${baseUrl}/${scope}`);
        }
      }
    }

    return scopes.join(' ');
  }

  /**
   * Build Google authorization URL
   */
  protected buildAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.googleConfig.clientId,
      redirect_uri: this.googleConfig.redirectUri,
      response_type: 'code',
      scope: this.resolvePermissions(),
      state,
      access_type: this.googleConfig.accessType ?? 'offline',
      prompt: this.googleConfig.prompt ?? 'consent',
    });

    return `${this.authorizationEndpoint}?${params.toString()}`;
  }

  /**
   * Handle callback from popup.
   *
   * The popup's postMessage payload (via /connect/google callback page) contains
   * the access_token already exchanged server-side at /api/connect/google.
   */
  protected async handleCallback(
    callbackData: Record<string, unknown>
  ): Promise<AuthResult> {
    const error = callbackData.error as string | undefined;

    if (error) {
      return {
        success: false,
        error,
        errorDescription: callbackData.error_description as string | undefined,
      };
    }

    const accessToken = callbackData.access_token as string | undefined;
    const refreshToken = callbackData.refresh_token as string | undefined;
    const expiresIn = Number(callbackData.expires_in) || 3600;
    const scope = callbackData.scope as string | undefined;
    const idToken = callbackData.id_token as string | undefined;

    if (!accessToken) {
      return {
        success: false,
        error: 'missing_access_token',
        errorDescription: 'No access token received from callback',
      };
    }

    const sessionInfo: GoogleSessionInfo = {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: 'Bearer',
      scope: scope ?? '',
      idToken,
    };

    this.lastSessionInfo = sessionInfo;

    return {
      success: true,
      token: {
        code: accessToken,
        tokenType: 'bearer',
        expiresAt: Date.now() + expiresIn * 1000,
        scope,
      },
      raw: callbackData,
    };
  }

  /**
   * Get session info from last successful login
   */
  getLastSessionInfo(): GoogleSessionInfo | null {
    return this.lastSessionInfo;
  }

  /**
   * Get resolved scope string from current permissions config
   */
  getResolvedScope(): string {
    return this.resolvePermissions();
  }
}
