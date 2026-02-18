import type { ProviderConfig } from '../../core';

/**
 * WhatsApp Embedded Signup configuration
 */
export interface WhatsAppConfig extends ProviderConfig {
  /**
   * Facebook App ID
   */
  clientId: string;

  /**
   * Facebook App Secret (optional - for backend token exchange)
   * WARNING: Do not use in frontend!
   */
  clientSecret?: string;

  /**
   * Config ID - Embedded Signup config from Meta Business Suite
   */
  configId: string;

  /**
   * Solution ID (optional)
   */
  solutionId?: string;

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

  /**
   * Requested permissions
   */
  scope?: string;

  /**
   * Extra options
   */
  extras?: WhatsAppExtras;
}

/**
 * WhatsApp Embedded Signup extra options
 */
export interface WhatsAppExtras {
  /**
   * Pre-verified phone number
   */
  preverifiedPhone?: string;

  /**
   * Pre-selected WABA ID
   */
  wabaId?: string;

  /**
   * Pre-selected Business ID
   */
  businessId?: string;

  /**
   * Feature type
   */
  featureType?: 'whatsapp_embedded_signup' | 'whatsapp_coexistence_signup';

  /**
   * Session info version
   */
  sessionInfoVersion?: number;
}

/**
 * WhatsApp auth response
 */
export interface WhatsAppAuthResponse {
  /**
   * Access token (token-based flow, legacy)
   */
  accessToken?: string;

  /**
   * Authorization code (code-based flow)
   */
  code?: string;

  /**
   * User ID
   */
  userID?: string;

  /**
   * Signed request
   */
  signedRequest?: string;

  /**
   * Graph domain
   */
  graphDomain?: string;

  /**
   * Data access expiration time
   */
  data_access_expiration_time?: number;

  /**
   * Expiration time (seconds)
   */
  expiresIn?: number;
}

/**
 * WA_EMBEDDED_SIGNUP success event data
 */
export interface WhatsAppEmbeddedSignupSuccessData {
  phone_number_id: string;
  waba_id: string;
  business_id: string;
  ad_account_ids?: string[];
  page_ids?: string[];
  dataset_ids?: string[];
}

/**
 * WA_EMBEDDED_SIGNUP error event data
 */
export interface WhatsAppEmbeddedSignupErrorData {
  error_message: string;
  error_id: string;
  session_id: string;
  timestamp: string;
}

/**
 * WA_EMBEDDED_SIGNUP success event payload
 */
export interface WhatsAppEmbeddedSignupSuccessEvent {
  type: 'WA_EMBEDDED_SIGNUP';
  event: string; // 'FINISH', 'SUBMIT', etc.
  data: WhatsAppEmbeddedSignupSuccessData;
}

/**
 * WA_EMBEDDED_SIGNUP error event payload
 */
export interface WhatsAppEmbeddedSignupErrorEvent {
  type: 'WA_EMBEDDED_SIGNUP';
  event: 'CANCEL';
  data: WhatsAppEmbeddedSignupErrorData;
}

/**
 * WA_EMBEDDED_SIGNUP unknown format (backwards compatibility)
 */
export interface WhatsAppEmbeddedSignupUnknownEvent {
  type: 'WA_EMBEDDED_SIGNUP';
  event: string;
  data: Record<string, unknown>;
}

/**
 * WA_EMBEDDED_SIGNUP event union type
 */
export type WhatsAppEmbeddedSignupEvent =
  | WhatsAppEmbeddedSignupSuccessEvent
  | WhatsAppEmbeddedSignupErrorEvent
  | WhatsAppEmbeddedSignupUnknownEvent;

/**
 * Type guard: Check if event is a successful signup
 */
export function isEmbeddedSignupSuccess(
  event: WhatsAppEmbeddedSignupEvent
): event is WhatsAppEmbeddedSignupSuccessEvent {
  return event.event !== 'CANCEL' && 'phone_number_id' in event.data;
}

/**
 * Type guard: Check if event is an error
 */
export function isEmbeddedSignupError(
  event: WhatsAppEmbeddedSignupEvent
): event is WhatsAppEmbeddedSignupErrorEvent {
  return event.event === 'CANCEL' && 'error_message' in event.data;
}

/**
 * Embedded Signup session info (normalized)
 */
export interface WhatsAppSessionInfo {
  /**
   * Authorization code (to be exchanged for access token on backend)
   */
  code: string;

  /**
   * Phone number ID
   */
  phoneNumberId?: string;

  /**
   * WABA ID (WhatsApp Business Account ID)
   */
  wabaId?: string;

  /**
   * Business ID
   */
  businessId?: string;

  /**
   * Phone number
   */
  phoneNumber?: string;

  /**
   * Phone number verified
   */
  phoneNumberVerified?: boolean;

  /**
   * Ad account IDs (optional)
   */
  adAccountIds?: string[];

  /**
   * Page IDs (optional)
   */
  pageIds?: string[];

  /**
   * Dataset IDs (optional)
   */
  datasetIds?: string[];

  /**
   * Raw event data (original data for debugging)
   */
  rawEvent?: WhatsAppEmbeddedSignupEvent;

  /**
   * Error info (if event is CANCEL)
   */
  error?: {
    message: string;
    errorId: string;
    sessionId: string;
    timestamp: string;
  };
}

/**
 * Facebook SDK login options
 */
export interface FBLoginOptions {
  config_id: string;
  response_type: string;
  override_default_response_type: boolean;
  extras: Record<string, unknown>;
}

/**
 * Facebook SDK global type declaration
 */
declare global {
  interface Window {
    FB?: {
      init: (params: {
        appId: string;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: FBLoginResponse) => void,
        options: FBLoginOptions
      ) => void;
      logout: (callback?: () => void) => void;
      getLoginStatus: (callback: (response: FBLoginResponse) => void) => void;
      api: (
        path: string,
        method: string | ((response: unknown) => void),
        params?: Record<string, unknown> | ((response: unknown) => void),
        callback?: (response: unknown) => void
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

/**
 * Facebook login response
 */
export interface FBLoginResponse {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse?: WhatsAppAuthResponse;
}
