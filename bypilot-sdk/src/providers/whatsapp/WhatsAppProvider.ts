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
 * Meta'nın WhatsApp Business Platform için Embedded Signup akışını yönetir.
 * Facebook SDK kullanarak OAuth 2.0 akışı gerçekleştirir.
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
 * // Login başlat
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
   * Facebook SDK'yı yükle
   */
  private async loadFacebookSDK(): Promise<void> {
    if (this.fbSDKLoaded && window.FB) {
      return;
    }

    if (this.fbSDKLoadPromise) {
      return this.fbSDKLoadPromise;
    }

    this.fbSDKLoadPromise = new Promise((resolve, reject) => {
      // Zaten yüklü mü kontrol et
      if (window.FB) {
        this.fbSDKLoaded = true;
        this.initFacebookSDK();
        resolve();
        return;
      }

      // SDK script'ini ekle
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

      // Mevcut script varsa kaldır
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
   * Facebook SDK'yı başlat
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
   * Authorization URL oluştur (redirect flow için)
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
   * Callback'i işle
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

    // Not: Token exchange backend'de yapılmalı (client secret gerekli)
    // Frontend'de sadece code döndürüyoruz
    return {
      success: true,
      raw: { code },
      token: {
        accessToken: code, // Bu aslında code, backend'de token'a çevrilmeli
        tokenType: 'authorization_code'
      }
    };
  }

  /**
   * WhatsApp Embedded Signup popup ile başlat
   *
   * Facebook SDK kullanarak native popup deneyimi sağlar.
   * Session info message event'i ile WABA ID, Phone Number ID ve access token alır.
   */
  override async loginWithPopup(_popupConfig?: PopupConfig): Promise<AuthResult> {
    this.emit('auth:start');

    try {
      await this.loadFacebookSDK();

      if (!window.FB) {
        throw new Error('Facebook SDK not available');
      }

      // Session info'yu dinle (popup'tan önce başlat)
      const sessionInfoPromise = this.waitForSessionInfo();

      const response = await this.launchEmbeddedSignup();

      // Kullanıcı yetkilendirmeyi reddetti
      if (response.status === 'not_authorized') {
        this.emit('auth:cancel');
        return {
          success: false,
          error: 'not_authorized',
          errorDescription: 'User did not authorize the app'
        };
      }

      // Code-based flow: authResponse.code veya session info'dan token al
      const authResponse = response.authResponse;

      // Session info'yu bekle (5 saniye timeout)
      let sessionInfo: WhatsAppSessionInfo | null = null;
      try {
        sessionInfo = await Promise.race([
          sessionInfoPromise,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
        ]);
      } catch {
        // Session info alınamadı, devam et
      }

      // Token oluştur: session info'dan veya authResponse'dan
      let token: OAuthToken;

      if (sessionInfo?.accessToken) {
        // Session info'dan access token al (tercih edilen yöntem)
        token = {
          accessToken: sessionInfo.accessToken,
          tokenType: 'bearer',
          scope: this.whatsappConfig.scope
        };

        // Session info'yu kaydet
        this.lastSessionInfo = sessionInfo;
      } else if (authResponse?.code) {
        // Authorization code döndü (backend'de token'a çevrilmeli)
        token = {
          accessToken: authResponse.code,
          tokenType: 'authorization_code'
        };
      } else if (authResponse?.accessToken) {
        // Doğrudan access token döndü
        token = this.buildToken(authResponse);
      } else {
        // Hiçbir token/code alınamadı
        return {
          success: false,
          error: 'no_token',
          errorDescription: 'No access token or authorization code received'
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
   * Session info için message event bekle
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
   * Embedded Signup event'ini parse et ve WhatsAppSessionInfo'ya dönüştür
   */
  private parseEmbeddedSignupEvent(event: WhatsAppEmbeddedSignupEvent): WhatsAppSessionInfo {
    // Raw event'i her zaman sakla
    const sessionInfo: WhatsAppSessionInfo = {
      accessToken: '',
      rawEvent: event
    };

    if (isEmbeddedSignupSuccess(event)) {
      // Başarılı event
      sessionInfo.phoneNumberId = event.data.phone_number_id;
      sessionInfo.wabaId = event.data.waba_id;
      sessionInfo.businessId = event.data.business_id;
      sessionInfo.adAccountIds = event.data.ad_account_ids;
      sessionInfo.pageIds = event.data.page_ids;
      sessionInfo.datasetIds = event.data.dataset_ids;
    } else if (isEmbeddedSignupError(event)) {
      // Hata event
      sessionInfo.error = {
        message: event.data.error_message,
        errorId: event.data.error_id,
        sessionId: event.data.session_id,
        timestamp: event.data.timestamp
      };
    } else {
      // Bilinmeyen format - raw data'dan çıkarım yap (geriye uyumluluk)
      const rawData = event.data as Record<string, unknown>;
      sessionInfo.phoneNumberId = rawData.phone_number_id as string | undefined;
      sessionInfo.wabaId = rawData.waba_id as string | undefined;
      sessionInfo.businessId = rawData.business_id as string | undefined;
      sessionInfo.phoneNumber = rawData.phone_number as string | undefined;
    }

    return sessionInfo;
  }

  /**
   * Son alınan session info
   */
  private lastSessionInfo: WhatsAppSessionInfo | null = null;

  /**
   * Son session info'yu al
   */
  getLastSessionInfo(): WhatsAppSessionInfo | null {
    return this.lastSessionInfo;
  }

  /**
   * Embedded Signup akışını başlat
   */
  private launchEmbeddedSignup(): Promise<FBLoginResponse> {
    return new Promise((resolve) => {
      const extras: Record<string, unknown> = {
        ...(this.whatsappConfig.extras ?? {}),
        featureType: this.whatsappConfig.extras?.featureType ?? 'whatsapp_embedded_signup',
        sessionInfoVersion: this.whatsappConfig.extras?.sessionInfoVersion ?? 3
      };

      // Solution ID varsa ekle
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
   * Auth response'dan token oluştur
   */
  private buildToken(authResponse: WhatsAppAuthResponse): OAuthToken {
    return {
      accessToken: authResponse.accessToken ?? '',
      tokenType: 'bearer',
      expiresAt: authResponse.expiresIn
        ? Date.now() + authResponse.expiresIn * 1000
        : undefined,
      scope: this.whatsappConfig.scope
    };
  }

  /**
   * Session info al (Embedded Signup sonrası)
   *
   * Facebook SDK message event'i ile session bilgilerini alır.
   * Type-safe parsing ile başarılı ve hata durumlarını ayırır.
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
   * Login durumunu kontrol et
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
   * Facebook'tan logout
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
   * Graph API çağrısı yap (Facebook SDK kullanarak)
   *
   * @param path - API endpoint (örn: 'me' veya 'v24.0/me')
   * @param method - HTTP method
   * @param params - Query/body parametreleri
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

    // Path'e version ekle (eğer yoksa)
    const version = this.whatsappConfig.graphApiVersion ?? 'v24.0';
    const versionedPath = path.startsWith('v') || path.startsWith('/v')
      ? path
      : `${version}/${path}`;

    return new Promise((resolve, reject) => {
      const accessToken = this.getAccessToken();

      window.FB!.api(
        versionedPath,
        method,
        { ...params, access_token: accessToken },
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
   * WhatsApp Cloud API'ye doğrudan HTTP çağrısı yap
   *
   * @param endpoint - API endpoint (örn: '123456/messages')
   * @param method - HTTP method
   * @param body - Request body
   */
  async whatsappAPI<T = unknown>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: Record<string, unknown>
  ): Promise<T> {
    const accessToken = this.getAccessToken();
    const version = this.whatsappConfig.graphApiVersion ?? 'v24.0';

    const url = `https://graph.facebook.com/${version}/${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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
   * Graph API version'unu al
   */
  getGraphApiVersion(): string {
    return this.whatsappConfig.graphApiVersion ?? 'v24.0';
  }
}
