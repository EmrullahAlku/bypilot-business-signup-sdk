import type { OAuthToken, StorageStrategy } from './types';

/**
 * Token yönetimi için storage wrapper
 */
export class TokenManager {
  private strategy: StorageStrategy;
  private memoryStorage: Map<string, string> = new Map();
  private storageKey: string;

  constructor(providerName: string, strategy: StorageStrategy = 'memory') {
    this.strategy = strategy;
    this.storageKey = `bypilot_${providerName}_token`;
  }

  /**
   * Token'ı storage'a kaydet
   */
  save(token: OAuthToken): void {
    const serialized = JSON.stringify(token);

    switch (this.strategy) {
      case 'localStorage':
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(this.storageKey, serialized);
        }
        break;
      case 'sessionStorage':
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(this.storageKey, serialized);
        }
        break;
      case 'memory':
      default:
        this.memoryStorage.set(this.storageKey, serialized);
        break;
    }
  }

  /**
   * Token'ı storage'dan getir
   */
  get(): OAuthToken | null {
    let serialized: string | null = null;

    switch (this.strategy) {
      case 'localStorage':
        if (typeof localStorage !== 'undefined') {
          serialized = localStorage.getItem(this.storageKey);
        }
        break;
      case 'sessionStorage':
        if (typeof sessionStorage !== 'undefined') {
          serialized = sessionStorage.getItem(this.storageKey);
        }
        break;
      case 'memory':
      default:
        serialized = this.memoryStorage.get(this.storageKey) ?? null;
        break;
    }

    if (!serialized) return null;

    try {
      return JSON.parse(serialized) as OAuthToken;
    } catch {
      return null;
    }
  }

  /**
   * Token'ı sil
   */
  clear(): void {
    switch (this.strategy) {
      case 'localStorage':
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(this.storageKey);
        }
        break;
      case 'sessionStorage':
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(this.storageKey);
        }
        break;
      case 'memory':
      default:
        this.memoryStorage.delete(this.storageKey);
        break;
    }
  }

  /**
   * Token'ın geçerli olup olmadığını kontrol et
   */
  isValid(): boolean {
    const token = this.get();
    if (!token) return false;

    if (token.expiresAt) {
      return Date.now() < token.expiresAt;
    }

    return true;
  }

  /**
   * Token'ın süresinin dolmasına kalan süre (ms)
   */
  getTimeUntilExpiry(): number | null {
    const token = this.get();
    if (!token?.expiresAt) return null;

    return Math.max(0, token.expiresAt - Date.now());
  }
}
