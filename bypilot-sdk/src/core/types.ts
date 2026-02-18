/**
 * OAuth token structure
 */
export interface OAuthToken {
  code: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType: string;
  scope?: string;
}

/**
 * Token storage strategy
 */
export type StorageStrategy = 'localStorage' | 'sessionStorage' | 'memory';

/**
 * OAuth client configuration
 */
export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scope?: string;
  state?: string;
  storage?: StorageStrategy;
}

/**
 * Popup configuration
 */
export interface PopupConfig {
  width?: number;
  height?: number;
  left?: number;
  top?: number;
}

/**
 * OAuth callback response
 */
export interface OAuthCallbackResponse {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

/**
 * Provider base configuration
 */
export interface ProviderConfig extends OAuthConfig {
  [key: string]: unknown;
}

/**
 * SDK event types
 */
export type SDKEventType =
  | 'auth:start'
  | 'auth:success'
  | 'auth:error'
  | 'auth:cancel'
  | 'token:refresh'
  | 'token:expire';

/**
 * SDK event listener
 */
export type SDKEventListener<T = unknown> = (data: T) => void;

/**
 * Auth result
 */
export interface AuthResult {
  success: boolean;
  token?: OAuthToken;
  error?: string;
  errorDescription?: string;
  raw?: Record<string, unknown>;
}
