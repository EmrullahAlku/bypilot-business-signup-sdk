/**
 * OAuth token yapısı
 */
export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType: string;
  scope?: string;
}

/**
 * Token storage stratejisi
 */
export type StorageStrategy = 'localStorage' | 'sessionStorage' | 'memory';

/**
 * OAuth client konfigürasyonu
 */
export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scope?: string;
  state?: string;
  storage?: StorageStrategy;
}

/**
 * Popup konfigürasyonu
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
 * Provider base konfigürasyonu
 */
export interface ProviderConfig extends OAuthConfig {
  [key: string]: unknown;
}

/**
 * SDK event tipleri
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
