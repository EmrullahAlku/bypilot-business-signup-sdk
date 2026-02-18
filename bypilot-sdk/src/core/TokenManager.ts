import type { OAuthToken, StorageStrategy } from './types';

/**
 * Token storage wrapper for managing OAuth tokens
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
   * Save token to storage
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
   * Get token from storage
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
   * Clear token from storage
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
   * Check if token is valid
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
   * Get time until token expiry (ms)
   */
  getTimeUntilExpiry(): number | null {
    const token = this.get();
    if (!token?.expiresAt) return null;

    return Math.max(0, token.expiresAt - Date.now());
  }
}
