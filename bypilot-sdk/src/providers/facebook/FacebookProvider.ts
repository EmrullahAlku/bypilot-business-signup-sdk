import { BaseProvider } from '../BaseProvider';
import type { AuthResult, OAuthToken, PopupConfig } from '../../core';
import type {
  FacebookConfig,
  FacebookAuthResponse,
  FacebookSessionInfo,
  FBLoginStatusResponse,
  FacebookPageInfo
} from './types';

/**
 * Facebook Login Provider
 *
 * Standard Facebook Login OAuth provider with code-based flow.
 * Uses Facebook SDK for native popup login experience.
 *
 * @example
 * ```typescript
 * const facebook = new FacebookProvider({
 *   clientId: 'YOUR_FB_APP_ID',
 *   redirectUri: 'https://yoursite.com/callback',
 *   scope: 'public_profile,email,pages_show_list'
 * });
 *
 * facebook.on('auth:success', (result) => {
 *   console.log('Authenticated!', result);
 * });
 *
 * await facebook.loginWithPopup();
 * ```
 */
export class FacebookProvider extends BaseProvider {
  readonly name = 'facebook';
  protected readonly authorizationEndpoint = 'https://www.facebook.com/v24.0/dialog/oauth';

  private fbSDKLoaded = false;
  private fbSDKLoadPromise: Promise<void> | null = null;
  private facebookConfig: FacebookConfig;
  private lastSessionInfo: FacebookSessionInfo | null = null;

  constructor(config: FacebookConfig) {
    super(config);
    this.facebookConfig = config;
  }

  /**
   * Load Facebook SDK
   */
  private async loadFacebookSDK(): Promise<void> {
    if (this.fbSDKLoaded && window.FB) {
      return;
    }

    if (this.fbSDKLoadPromise) {
      return this.fbSDKLoadPromise;
    }

    this.fbSDKLoadPromise = new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.FB) {
        this.fbSDKLoaded = true;
        this.initFacebookSDK();
        resolve();
        return;
      }

      // Add SDK script
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;

      window.fbAsyncInit = () => {
        this.initFacebookSDK();
        this.fbSDKLoaded = true;
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Failed to load Facebook SDK'));
      };

      // Remove existing script if present
      const existingScript = document.getElementById('facebook-jssdk');
      if (existingScript) {
        existingScript.remove();
      }

      document.head.appendChild(script);

      // Timeout
      setTimeout(() => {
        if (!this.fbSDKLoaded) {
          reject(new Error('Facebook SDK load timeout'));
        }
      }, 10000);
    });

    return this.fbSDKLoadPromise;
  }

  /**
   * Initialize Facebook SDK
   */
  private initFacebookSDK(): void {
    if (!window.FB) return;

    window.FB.init({
      appId: this.facebookConfig.clientId,
      cookie: true,
      xfbml: true,
      version: this.facebookConfig.sdkVersion ?? 'v24.0'
    });
  }

  /**
   * Build authorization URL (for redirect flow)
   */
  protected buildAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.facebookConfig.clientId,
      redirect_uri: this.facebookConfig.redirectUri,
      state,
      response_type: 'code',
      scope: this.facebookConfig.scope ?? 'public_profile,email'
    });

    if (this.facebookConfig.configId) {
      params.set('config_id', this.facebookConfig.configId);
    }

    return `${this.authorizationEndpoint}?${params.toString()}`;
  }

  /**
   * Handle callback
   */
  protected async handleCallback(callbackData: Record<string, unknown>): Promise<AuthResult> {
    const code = callbackData.code as string | undefined;
    const error = callbackData.error as string | undefined;

    if (error) {
      return {
        success: false,
        error,
        errorDescription: callbackData.error_description as string | undefined
      };
    }

    if (!code) {
      return {
        success: false,
        error: 'missing_code',
        errorDescription: 'Authorization code not found in callback'
      };
    }

    return {
      success: true,
      raw: { code },
      token: {
        code,
        tokenType: 'authorization_code'
      }
    };
  }

  /**
   * Start Facebook Login via popup
   *
   * Uses Facebook SDK for native popup experience.
   * Returns authorization code for backend token exchange.
   */
  override async loginWithPopup(_popupConfig?: PopupConfig): Promise<AuthResult> {
    this.emit('auth:start');

    try {
      await this.loadFacebookSDK();

      if (!window.FB) {
        throw new Error('Facebook SDK not available');
      }

      const response = await this.launchFBLogin();

      // User denied authorization
      if (response.status === 'not_authorized' || response.status === 'unknown') {
        this.emit('auth:cancel');
        return {
          success: false,
          error: response.status === 'not_authorized' ? 'not_authorized' : 'cancelled',
          errorDescription: response.status === 'not_authorized'
            ? 'User did not authorize the app'
            : 'User cancelled the login'
        };
      }

      const authResponse = response.authResponse;

      // Build token from response
      let token: OAuthToken;

      if (authResponse?.code) {
        token = {
          code: authResponse.code,
          tokenType: 'authorization_code',
          scope: this.facebookConfig.scope
        };
      } else if (authResponse?.accessToken) {
        token = this.buildToken(authResponse);
      } else {
        return {
          success: false,
          error: 'no_code',
          errorDescription: 'No authorization code received'
        };
      }

      // Build session info
      const sessionInfo: FacebookSessionInfo = {
        code: token.code,
        userId: authResponse?.userID,
        grantedPermissions: authResponse?.grantedScopes?.split(',').filter(Boolean),
        deniedPermissions: authResponse?.deniedScopes?.split(',').filter(Boolean)
      };

      this.lastSessionInfo = sessionInfo;
      this.tokenManager.save(token);

      const result: AuthResult = {
        success: true,
        token,
        raw: {
          ...(authResponse as unknown as Record<string, unknown>),
          sessionInfo
        }
      };

      this.emit('auth:success', result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('closed') || errorMessage.includes('cancel')) {
        this.emit('auth:cancel');
      } else {
        this.emit('auth:error', { error: errorMessage });
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Launch Facebook Login dialog
   */
  private launchFBLogin(): Promise<FBLoginStatusResponse> {
    return new Promise((resolve) => {
      const scope = this.facebookConfig.scope ?? 'public_profile,email';

      const options: Record<string, unknown> = {
        scope,
        response_type: 'code',
        override_default_response_type: true
      };

      if (this.facebookConfig.configId) {
        options.config_id = this.facebookConfig.configId;
      }

      window.FB!.login(
        (response) => resolve(response as unknown as FBLoginStatusResponse),
        options as unknown as Parameters<NonNullable<Window['FB']>['login']>[1]
      );
    });
  }

  /**
   * Build token from auth response (legacy/token flow)
   */
  private buildToken(authResponse: FacebookAuthResponse): OAuthToken {
    return {
      code: authResponse.accessToken ?? '',
      tokenType: 'bearer',
      expiresAt: authResponse.expiresIn
        ? Date.now() + authResponse.expiresIn * 1000
        : undefined,
      scope: this.facebookConfig.scope
    };
  }

  /**
   * Get last session info
   */
  getLastSessionInfo(): FacebookSessionInfo | null {
    return this.lastSessionInfo;
  }

  /**
   * Check login status
   */
  async checkLoginStatus(): Promise<FBLoginStatusResponse | null> {
    try {
      await this.loadFacebookSDK();

      if (!window.FB) return null;

      return new Promise((resolve) => {
        window.FB!.getLoginStatus((response) => {
          resolve(response as unknown as FBLoginStatusResponse);
        });
      });
    } catch {
      return null;
    }
  }

  /**
   * Get granted permissions for current user
   */
  async getGrantedPermissions(): Promise<string[]> {
    try {
      const data = await this.graphAPI<{
        data: Array<{ permission: string; status: string }>;
      }>('me/permissions');

      return data.data
        .filter((p) => p.status === 'granted')
        .map((p) => p.permission);
    } catch {
      return [];
    }
  }

  /**
   * Get denied permissions for current user
   */
  async getDeniedPermissions(): Promise<string[]> {
    try {
      const data = await this.graphAPI<{
        data: Array<{ permission: string; status: string }>;
      }>('me/permissions');

      return data.data
        .filter((p) => p.status === 'declined')
        .map((p) => p.permission);
    } catch {
      return [];
    }
  }

  /**
   * Get pages the user manages
   */
  async getPages(): Promise<FacebookPageInfo[]> {
    try {
      const data = await this.graphAPI<{
        data: Array<{ id: string; name: string; access_token: string }>;
      }>('me/accounts');

      return data.data.map((page) => ({
        id: page.id,
        name: page.name,
        accessToken: page.access_token
      }));
    } catch {
      return [];
    }
  }

  /**
   * Logout from Facebook
   */
  override logout(): void {
    super.logout();
    this.lastSessionInfo = null;

    if (window.FB) {
      try {
        window.FB.logout();
      } catch {
        // Ignore errors
      }
    }
  }

  /**
   * Make a Graph API call (via Facebook SDK)
   *
   * @param path - API endpoint (e.g., 'me' or 'v24.0/me')
   * @param method - HTTP method
   * @param params - Query/body parameters
   */
  async graphAPI<T = unknown>(
    path: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    params?: Record<string, unknown>
  ): Promise<T> {
    await this.loadFacebookSDK();

    if (!window.FB) {
      throw new Error('Facebook SDK not available');
    }

    // Add version to path if not present
    const version = this.facebookConfig.graphApiVersion ?? 'v24.0';
    const versionedPath = path.startsWith('v') || path.startsWith('/v')
      ? path
      : `${version}/${path}`;

    return new Promise((resolve, reject) => {
      const code = this.getCode();

      window.FB!.api(
        versionedPath,
        method,
        { ...params, access_token: code },
        (response: unknown) => {
          const resp = response as Record<string, unknown>;
          if (resp.error) {
            reject(new Error((resp.error as Record<string, string>).message ?? 'Graph API error'));
          } else {
            resolve(response as T);
          }
        }
      );
    });
  }

  /**
   * Get Graph API version
   */
  getGraphApiVersion(): string {
    return this.facebookConfig.graphApiVersion ?? 'v24.0';
  }
}
