import type { SDKEventType, SDKEventListener } from './types';

/**
 * SDK için basit event emitter
 */
export class EventEmitter {
  private listeners: Map<SDKEventType, Set<SDKEventListener>> = new Map();

  /**
   * Event listener ekle
   */
  on<T = unknown>(event: SDKEventType, listener: SDKEventListener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(listener as SDKEventListener);

    // Unsubscribe fonksiyonu döndür
    return () => this.off(event, listener);
  }

  /**
   * Event listener kaldır
   */
  off<T = unknown>(event: SDKEventType, listener: SDKEventListener<T>): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener as SDKEventListener);
    }
  }

  /**
   * Event tetikle
   */
  emit<T = unknown>(event: SDKEventType, data?: T): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`[ByPilot SDK] Event listener error for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Tek seferlik event listener
   */
  once<T = unknown>(event: SDKEventType, listener: SDKEventListener<T>): () => void {
    const onceListener: SDKEventListener<T> = (data) => {
      this.off(event, onceListener);
      listener(data);
    };

    return this.on(event, onceListener);
  }

  /**
   * Tüm listener'ları temizle
   */
  removeAllListeners(event?: SDKEventType): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
