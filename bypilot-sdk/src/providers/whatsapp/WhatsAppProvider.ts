import { BaseProvider } from '../BaseProvider';
import type { AuthResult, OAuthToken, PopupConfig } from '../../core';
import type {
  WhatsAppConfig,
  WhatsAppAuthResponse,
  WhatsAppSessionInfo,
  FBLoginResponse,
  WhatsAppEmbeddedSignupEvent
} from './types';
import { isEmbeddedSignupSuccess, isEmbeddedSignupError } from './types';

/**
 * WhatsApp Embedded Signup Provider
 *
 * Manages the Embedded Signup flow for Meta's WhatsApp Business Platform.
 * Uses Facebook SDK for OAuth 2.0 code-based flow.
 *
 * @example
 * ```typescript
 * const whatsapp = new WhatsAppProvider({
 *   clientId: 'YOUR_FB_APP_ID',
 *   configId: 'YOUR_CONFIG_ID',
 *   redirectUri: 'https://yoursite.com/callback'
 * });
 *
 * // Event listener
 * whatsapp.on('auth:success', (result) => {
 *   console.log('Authenticated!', result);
 * });
 *
 * // Start login
 * await whatsapp.loginWithPopup();
 * ```
 */
export class WhatsAppProvider extends BaseProvider {
  readonly name = 'whatsapp';
  protected readonly authorizationEndpoint = 'https://www.facebook.com/v24.0/dialog/oauth';

  private fbSDKLoaded = false;
  private fbSDKLoadPromise: Promise<void> | null = null;
  private whatsappConfig: WhatsAppConfig;

  constructor(config: WhatsAppConfig) {
    super(config);
    this.whatsappConfig = config;
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
      script.src = `https://connect.facebook.net/en_US/sdk.js`;
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
      appId: this.whatsappConfig.clientId,
      cookie: true,
      xfbml: true,
      version: this.whatsappConfig.sdkVersion ?? 'v24.0'
    });
  }

  /**
   * Build authorization URL (for redirect flow)
   */
  protected buildAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.whatsappConfig.clientId,
      redirect_uri: this.whatsappConfig.redirectUri,
      state,
      response_type: 'code',
      config_id: this.whatsappConfig.configId,
      scope: this.whatsappConfig.scope ?? 'whatsapp_business_management,whatsapp_business_messaging'
    });

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

    // Note: Token exchange must happen on backend (client secret required)
    // Frontend only returns the code
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
   * Start WhatsApp Embedded Signup via popup
   *
   * Uses Facebook SDK for native popup experience.
   * Receives session info (WABA ID, Phone Number ID) and authorization code via message events.
   */
  override async loginWithPopup(_popupConfig?: PopupConfig): Promise<AuthResult> {
    this.emit('auth:start');

    try {
      await this.loadFacebookSDK();

      if (!window.FB) {
        throw new Error('Facebook SDK not available');
      }

      // Start listening for session info (before popup opens)
      const sessionInfoPromise = this.waitForSessionInfo();

      const response = await this.launchEmbeddedSignup();

      // User denied authorization
      if (response.status === 'not_authorized') {
        this.emit('auth:cancel');
        return {
          success: false,
          error: 'not_authorized',
          errorDescription: 'User did not authorize the app'
        };
      }

      // Code-based flow: get code from authResponse or session info
      const authResponse = response.authResponse;

      // Wait for session info (5 second timeout)
      let sessionInfo: WhatsAppSessionInfo | null = null;
      try {
        sessionInfo = await Promise.race([
          sessionInfoPromise,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
        ]);
      } catch {
        // Session info not available, continue
      }

      // Build token: from session info or authResponse
      let token: OAuthToken;

      if (sessionInfo?.code) {
        // Get code from session info (preferred method)
        token = {
          code: sessionInfo.code,
          tokenType: 'authorization_code',
          scope: this.whatsappConfig.scope
        };

        // Save session info
        this.lastSessionInfo = sessionInfo;
      } else if (authResponse?.code) {
        // Authorization code returned (backend must exchange for token)
        token = {
          code: authResponse.code,
          tokenType: 'authorization_code'
        };
      } else if (authResponse?.accessToken) {
        // Direct access token returned (legacy flow)
        token = this.buildToken(authResponse);
      } else {
        // No code received
        return {
          success: false,
          error: 'no_code',
          errorDescription: 'No authorization code received'
        };
      }

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
   * Wait for session info via message event
   */
  private waitForSessionInfo(): Promise<WhatsAppSessionInfo> {
    return new Promise((resolve) => {
      const handler = (event: MessageEvent) => {
        if (
          event.origin !== 'https://www.facebook.com' &&
          event.origin !== 'https://web.facebook.com'
        ) {
          return;
        }

        try {
          const data = JSON.parse(event.data);

          if (data.type === 'WA_EMBEDDED_SIGNUP') {
            window.removeEventListener('message', handler);

            const embeddedEvent = data as WhatsAppEmbeddedSignupEvent;
            const sessionInfo = this.parseEmbeddedSignupEvent(embeddedEvent);

            resolve(sessionInfo);
          }
        } catch {
          // JSON parse error, ignore
        }
      };

      window.addEventListener('message', handler);
    });
  }

  /**
   * Parse Embedded Signup event into WhatsAppSessionInfo
   */
  private parseEmbeddedSignupEvent(event: WhatsAppEmbeddedSignupEvent): WhatsAppSessionInfo {
    // Always store raw event
    const sessionInfo: WhatsAppSessionInfo = {
      code: '',
      rawEvent: event
    };

    if (isEmbeddedSignupSuccess(event)) {
      // Successful event
      sessionInfo.phoneNumberId = event.data.phone_number_id;
      sessionInfo.wabaId = event.data.waba_id;
      sessionInfo.businessId = event.data.business_id;
      sessionInfo.adAccountIds = event.data.ad_account_ids;
      sessionInfo.pageIds = event.data.page_ids;
      sessionInfo.datasetIds = event.data.dataset_ids;
    } else if (isEmbeddedSignupError(event)) {
      // Error event
      sessionInfo.error = {
        message: event.data.error_message,
        errorId: event.data.error_id,
        sessionId: event.data.session_id,
        timestamp: event.data.timestamp
      };
    } else {
      // Unknown format - extract from raw data (backwards compatibility)
      const rawData = event.data as Record<string, unknown>;
      sessionInfo.phoneNumberId = rawData.phone_number_id as string | undefined;
      sessionInfo.wabaId = rawData.waba_id as string | undefined;
      sessionInfo.businessId = rawData.business_id as string | undefined;
      sessionInfo.phoneNumber = rawData.phone_number as string | undefined;
    }

    return sessionInfo;
  }

  /**
   * Last received session info
   */
  private lastSessionInfo: WhatsAppSessionInfo | null = null;

  /**
   * Get last session info
   */
  getLastSessionInfo(): WhatsAppSessionInfo | null {
    return this.lastSessionInfo;
  }

  /**
   * Launch Embedded Signup flow
   */
  private launchEmbeddedSignup(): Promise<FBLoginResponse> {
    return new Promise((resolve) => {
      const extras: Record<string, unknown> = {
        ...(this.whatsappConfig.extras ?? {}),
        featureType: this.whatsappConfig.extras?.featureType ?? 'whatsapp_embedded_signup',
        sessionInfoVersion: this.whatsappConfig.extras?.sessionInfoVersion ?? 3
      };

      // Add Solution ID if provided
      if (this.whatsappConfig.solutionId) {
        extras.solutionID = this.whatsappConfig.solutionId;
      }

      window.FB!.login(
        (response) => resolve(response),
        {
          config_id: this.whatsappConfig.configId,
          response_type: 'code',
          override_default_response_type: true,
          extras
        }
      );
    });
  }

  /**
   * Build token from auth response (legacy flow)
   */
  private buildToken(authResponse: WhatsAppAuthResponse): OAuthToken {
    return {
      code: authResponse.accessToken ?? '',
      tokenType: 'bearer',
      expiresAt: authResponse.expiresIn
        ? Date.now() + authResponse.expiresIn * 1000
        : undefined,
      scope: this.whatsappConfig.scope
    };
  }

  /**
   * Listen for session info (after Embedded Signup)
   *
   * Receives session info via Facebook SDK message events.
   * Type-safe parsing separates success and error states.
   */
  getSessionInfoListener(callback: (info: WhatsAppSessionInfo) => void): () => void {
    const handler = (event: MessageEvent) => {
      if (
        event.origin !== 'https://www.facebook.com' &&
        event.origin !== 'https://web.facebook.com'
      ) {
        return;
      }

      try {
        const data = JSON.parse(event.data);

        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          const embeddedEvent = data as WhatsAppEmbeddedSignupEvent;
          const sessionInfo = this.parseEmbeddedSignupEvent(embeddedEvent);

          callback(sessionInfo);
        }
      } catch {
        // JSON parse error, ignore
      }
    };

    window.addEventListener('message', handler);

    return () => window.removeEventListener('message', handler);
  }

  /**
   * Check login status
   */
  async checkLoginStatus(): Promise<FBLoginResponse | null> {
    try {
      await this.loadFacebookSDK();

      if (!window.FB) return null;

      return new Promise((resolve) => {
        window.FB!.getLoginStatus((response) => {
          resolve(response);
        });
      });
    } catch {
      return null;
    }
  }

  /**
   * Logout from Facebook
   */
  override logout(): void {
    super.logout();

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
    const version = this.whatsappConfig.graphApiVersion ?? 'v24.0';
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
   * Make a direct HTTP call to WhatsApp Cloud API
   *
   * @param endpoint - API endpoint (e.g., '123456/messages')
   * @param method - HTTP method
   * @param body - Request body
   */
  async whatsappAPI<T = unknown>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: Record<string, unknown>
  ): Promise<T> {
    const code = this.getCode();
    const version = this.whatsappConfig.graphApiVersion ?? 'v24.0';

    const url = `https://graph.facebook.com/${version}/${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${code}`,
        'Content-Type': 'application/json'
      }
    };

    if (body && (method === 'POST' || method === 'DELETE')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get Graph API version
   */
  getGraphApiVersion(): string {
    return this.whatsappConfig.graphApiVersion ?? 'v24.0';
  }
}
