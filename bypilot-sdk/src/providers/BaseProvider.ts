import { TokenManager, EventEmitter, PopupManager } from '../core';
import type {
  ProviderConfig,
  OAuthToken,
  AuthResult,
  PopupConfig,
  StorageStrategy
} from '../core';

/**
 * Base class for all OAuth providers
 */
export abstract class BaseProvider extends EventEmitter {
  protected config: ProviderConfig;
  protected tokenManager: TokenManager;
  protected popupManager: PopupManager;

  /**
   * Provider name (subclasses must override)
   */
  abstract readonly name: string;

  /**
   * OAuth authorization URL
   */
  protected abstract readonly authorizationEndpoint: string;

  constructor(config: ProviderConfig) {
    super();
    this.config = config;
    this.tokenManager = new TokenManager(
      this.constructor.name.toLowerCase(),
      config.storage ?? 'memory'
    );
    this.popupManager = new PopupManager();
  }

  /**
   * Build authorization URL
   */
  protected abstract buildAuthorizationUrl(state: string): string;

  /**
   * Handle callback and extract code
   */
  protected abstract handleCallback(callbackData: Record<string, unknown>): Promise<AuthResult>;

  /**
   * Generate random state
   */
  protected generateState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Start login via popup
   */
  async loginWithPopup(popupConfig?: PopupConfig): Promise<AuthResult> {
    this.emit('auth:start');

    const state = this.config.state ?? this.generateState();
    const authUrl = this.buildAuthorizationUrl(state);

    // Store state in session (CSRF protection)
    sessionStorage.setItem(`bypilot_state_${this.name}`, state);

    try {
      this.popupManager.open(authUrl, popupConfig);

      // Wait for callback
      const callbackData = await this.popupManager.waitForCallback<Record<string, unknown>>(
        window.location.origin
      );

      // Validate state
      const savedState = sessionStorage.getItem(`bypilot_state_${this.name}`);
      if (callbackData.state !== savedState) {
        throw new Error('State mismatch - possible CSRF attack');
      }

      const result = await this.handleCallback(callbackData);

      if (result.success && result.token) {
        this.tokenManager.save(result.token);
        this.emit('auth:success', result);
      } else {
        this.emit('auth:error', result);
      }

      return result;
    } catch (error) {
      const errorResult: AuthResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      if (error instanceof Error && error.message.includes('closed by user')) {
        this.emit('auth:cancel');
      } else {
        this.emit('auth:error', errorResult);
      }

      return errorResult;
    } finally {
      sessionStorage.removeItem(`bypilot_state_${this.name}`);
    }
  }

  /**
   * Start login via redirect
   */
  loginWithRedirect(): void {
    this.emit('auth:start');

    const state = this.config.state ?? this.generateState();
    const authUrl = this.buildAuthorizationUrl(state);

    // Store state
    sessionStorage.setItem(`bypilot_state_${this.name}`, state);

    window.location.href = authUrl;
  }

  /**
   * Handle redirect callback (should be called on page load)
   */
  async handleRedirectCallback(): Promise<AuthResult | null> {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (!code && !error) {
      return null; // Not a callback
    }

    // Validate state
    const savedState = sessionStorage.getItem(`bypilot_state_${this.name}`);
    if (state !== savedState) {
      const result: AuthResult = {
        success: false,
        error: 'state_mismatch',
        errorDescription: 'State mismatch - possible CSRF attack'
      };
      this.emit('auth:error', result);
      return result;
    }

    sessionStorage.removeItem(`bypilot_state_${this.name}`);

    if (error) {
      const result: AuthResult = {
        success: false,
        error,
        errorDescription: urlParams.get('error_description') ?? undefined
      };
      this.emit('auth:error', result);
      return result;
    }

    try {
      const callbackData: Record<string, unknown> = {};
      urlParams.forEach((value, key) => {
        callbackData[key] = value;
      });

      const result = await this.handleCallback(callbackData);

      if (result.success && result.token) {
        this.tokenManager.save(result.token);
        this.emit('auth:success', result);
      } else {
        this.emit('auth:error', result);
      }

      // Clean URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);

      return result;
    } catch (error) {
      const errorResult: AuthResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      this.emit('auth:error', errorResult);
      return errorResult;
    }
  }

  /**
   * Get current token object
   */
  getToken(): OAuthToken | null {
    return this.tokenManager.get();
  }

  /**
   * Get authorization code
   */
  getCode(): string | null {
    return this.tokenManager.get()?.code ?? null;
  }

  /**
   * @deprecated Use getCode() instead
   */
  getAccessToken(): string | null {
    return this.getCode();
  }

  /**
   * Is token valid?
   */
  isAuthenticated(): boolean {
    return this.tokenManager.isValid();
  }

  /**
   * Logout - clear token
   */
  logout(): void {
    this.tokenManager.clear();
    this.emit('token:expire');
  }

  /**
   * Change storage strategy
   */
  setStorageStrategy(strategy: StorageStrategy): void {
    const currentToken = this.tokenManager.get();
    this.tokenManager = new TokenManager(this.name, strategy);
    if (currentToken) {
      this.tokenManager.save(currentToken);
    }
  }
}
