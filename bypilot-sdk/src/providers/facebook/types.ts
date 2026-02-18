import type { ProviderConfig } from '../../core';

/**
 * Facebook Login configuration
 */
export interface FacebookConfig extends ProviderConfig {
  /**
   * Facebook App ID
   */
  clientId: string;

  /**
   * Config ID (optional - only needed for embedded flows)
   */
  configId?: string;

  /**
   * Requested permissions (comma-separated)
   * @default 'public_profile,email'
   */
  scope?: string;

  /**
   * Facebook SDK version
   * @default 'v24.0'
   */
  sdkVersion?: string;

  /**
   * Graph API version
   * @default 'v24.0'
   */
  graphApiVersion?: string;

  /**
   * Redirect URI (callback URL)
   */
  redirectUri: string;
}

/**
 * Facebook auth response from FB.login()
 */
export interface FacebookAuthResponse {
  /**
   * Access token
   */
  accessToken?: string;

  /**
   * Authorization code (code-based flow)
   */
  code?: string;

  /**
   * Facebook User ID
   */
  userID?: string;

  /**
   * Signed request
   */
  signedRequest?: string;

  /**
   * Token expiration time (seconds)
   */
  expiresIn?: number;

  /**
   * Permissions granted by user (comma-separated)
   */
  grantedScopes?: string;

  /**
   * Permissions denied by user (comma-separated)
   */
  deniedScopes?: string;
}

/**
 * Facebook page info
 */
export interface FacebookPageInfo {
  id: string;
  name: string;
  accessToken: string;
}

/**
 * Facebook session info (normalized)
 */
export interface FacebookSessionInfo {
  /**
   * Authorization code (to be exchanged for access token on backend)
   */
  code: string;

  /**
   * Facebook User ID
   */
  userId?: string;

  /**
   * User email
   */
  email?: string;

  /**
   * User display name
   */
  name?: string;

  /**
   * Permissions granted by user
   */
  grantedPermissions?: string[];

  /**
   * Permissions denied by user
   */
  deniedPermissions?: string[];

  /**
   * Pages the user has access to
   */
  pages?: FacebookPageInfo[];
}

/**
 * Facebook login response (reuses global FB type)
 */
export interface FBLoginStatusResponse {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse?: FacebookAuthResponse;
}
