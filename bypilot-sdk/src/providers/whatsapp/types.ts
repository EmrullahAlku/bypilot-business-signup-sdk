import type { ProviderConfig } from '../../core';

/**
 * WhatsApp Embedded Signup konfigürasyonu
 */
export interface WhatsAppConfig extends ProviderConfig {
  /**
   * Facebook App ID
   */
  clientId: string;

  /**
   * Facebook App Secret (opsiyonel - backend token exchange için)
   * DİKKAT: Frontend'de kullanılmamalı!
   */
  clientSecret?: string;

  /**
   * Config ID - Meta Business Suite'den alınan Embedded Signup config
   */
  configId: string;

  /**
   * Solution ID (opsiyonel)
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
   * İstenen izinler
   */
  scope?: string;

  /**
   * Ek özellikler
   */
  extras?: WhatsAppExtras;
}

/**
 * WhatsApp Embedded Signup ek özellikleri
 */
export interface WhatsAppExtras {
  /**
   * Önceden doldurulmuş telefon numarası
   */
  preverifiedPhone?: string;

  /**
   * Önceden seçilmiş WABA ID
   */
  wabaId?: string;

  /**
   * Önceden seçilmiş Business ID
   */
  businessId?: string;

  /**
   * Feature tipi
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
   * Access token (token-based flow)
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
   * Token tipi
   */
  signedRequest?: string;

  /**
   * Graphdomain
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
 * Embedded Signup session info
 */
export interface WhatsAppSessionInfo {
  /**
   * Access token
   */
  accessToken: string;

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
