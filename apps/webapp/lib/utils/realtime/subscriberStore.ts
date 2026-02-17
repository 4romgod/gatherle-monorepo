import type { SharedRealtimeSubscriber, SharedRealtimeSubscriberUpdates } from './types';

export class SharedRealtimeSubscriberStore {
  private readonly subscribers = new Map<number, SharedRealtimeSubscriber>();
  private sequence = 0;
  private connected = false;

  isConnected(): boolean {
    return this.connected;
  }

  enabledCount(): number {
    let count = 0;
    this.subscribers.forEach((subscriber) => {
      if (subscriber.enabled) {
        count += 1;
      }
    });
    return count;
  }

  hasEnabledSubscribers(): boolean {
    return this.enabledCount() > 0;
  }

  setConnected(connected: boolean): void {
    if (this.connected === connected) {
      return;
    }

    this.connected = connected;
    this.subscribers.forEach((subscriber) => {
      subscriber.setConnected(connected);
    });
  }

  add(subscriber: SharedRealtimeSubscriber): number {
    const subscriberId = ++this.sequence;
    this.subscribers.set(subscriberId, subscriber);
    return subscriberId;
  }

  update(subscriberId: number, updates: SharedRealtimeSubscriberUpdates): void {
    const existingSubscriber = this.subscribers.get(subscriberId);
    if (!existingSubscriber) {
      return;
    }

    if (typeof updates.enabled === 'boolean') {
      existingSubscriber.enabled = updates.enabled;
    }

    if (Object.hasOwn(updates, 'onMessage')) {
      existingSubscriber.onMessage = updates.onMessage;
    }

    if (Object.hasOwn(updates, 'onOpen')) {
      existingSubscriber.onOpen = updates.onOpen;
    }

    if (Object.hasOwn(updates, 'onClose')) {
      existingSubscriber.onClose = updates.onClose;
    }

    if (Object.hasOwn(updates, 'onError')) {
      existingSubscriber.onError = updates.onError;
    }
  }

  remove(subscriberId: number): void {
    this.subscribers.delete(subscriberId);
  }

  forEachEnabled(callback: (subscriber: SharedRealtimeSubscriber) => void): void {
    this.subscribers.forEach((subscriber) => {
      if (subscriber.enabled) {
        callback(subscriber);
      }
    });
  }

  dispatchMessage(data: string): void {
    this.forEachEnabled((subscriber) => {
      subscriber.onMessage?.(data);
    });
  }
}
