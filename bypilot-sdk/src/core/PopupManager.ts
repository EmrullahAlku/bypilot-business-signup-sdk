import type { PopupConfig } from './types';

/**
 * OAuth popup yönetimi
 */
export class PopupManager {
  private popup: Window | null = null;
  private checkInterval: number | null = null;

  /**
   * Popup aç ve URL'e yönlendir
   */
  open(url: string, config: PopupConfig = {}): Window | null {
    const {
      width = 600,
      height = 700,
      left = window.screenX + (window.outerWidth - width) / 2,
      top = window.screenY + (window.outerHeight - height) / 2
    } = config;

    const features = [
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
      'toolbar=no',
      'menubar=no',
      'scrollbars=yes',
      'resizable=yes'
    ].join(',');

    this.popup = window.open(url, 'bypilot_oauth', features);

    return this.popup;
  }

  /**
   * Popup'ın kapanmasını bekle
   */
  waitForClose(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.popup) {
        resolve();
        return;
      }

      this.checkInterval = window.setInterval(() => {
        if (!this.popup || this.popup.closed) {
          this.cleanup();
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Popup'tan callback al (postMessage ile)
   */
  waitForCallback<T>(origin: string, timeout = 300000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error('OAuth callback timeout'));
      }, timeout);

      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== origin) return;

        if (event.data?.type === 'bypilot_oauth_callback') {
          cleanup();
          resolve(event.data.payload as T);
        }
      };

      const cleanup = () => {
        window.clearTimeout(timeoutId);
        window.removeEventListener('message', messageHandler);
        this.cleanup();
      };

      window.addEventListener('message', messageHandler);

      // Popup kapanma kontrolü
      this.checkInterval = window.setInterval(() => {
        if (!this.popup || this.popup.closed) {
          cleanup();
          reject(new Error('OAuth popup closed by user'));
        }
      }, 100);
    });
  }

  /**
   * Popup'ı kapat ve temizle
   */
  close(): void {
    if (this.popup && !this.popup.closed) {
      this.popup.close();
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.checkInterval) {
      window.clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.popup = null;
  }

  /**
   * Popup aktif mi?
   */
  isOpen(): boolean {
    return this.popup !== null && !this.popup.closed;
  }
}
