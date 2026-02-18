import type { SDKEventType, SDKEventListener } from './types';

/**
 * Simple event emitter for the SDK
 */
export class EventEmitter {
  private listeners: Map<SDKEventType, Set<SDKEventListener>> = new Map();

  /**
   * Add event listener
   */
  on<T = unknown>(event: SDKEventType, listener: SDKEventListener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(listener as SDKEventListener);

    // Return unsubscribe function
    return () => this.off(event, listener);
  }

  /**
   * Remove event listener
   */
  off<T = unknown>(event: SDKEventType, listener: SDKEventListener<T>): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener as SDKEventListener);
    }
  }

  /**
   * Emit event
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
   * One-time event listener
   */
  once<T = unknown>(event: SDKEventType, listener: SDKEventListener<T>): () => void {
    const onceListener: SDKEventListener<T> = (data) => {
      this.off(event, onceListener);
      listener(data);
    };

    return this.on(event, onceListener);
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(event?: SDKEventType): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
