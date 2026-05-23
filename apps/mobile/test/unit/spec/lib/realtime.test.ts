import { SharedRealtimeSubscriberStore } from '@/lib/realtime/subscriberStore';

describe('SharedRealtimeSubscriberStore', () => {
  it('tracks enabled subscriber counts and connection state', () => {
    const store = new SharedRealtimeSubscriberStore();
    const firstSetConnected = jest.fn();
    const secondSetConnected = jest.fn();

    const firstId = store.add({ enabled: true, setConnected: firstSetConnected });
    const secondId = store.add({ enabled: false, setConnected: secondSetConnected });

    expect(firstId).toBe(1);
    expect(secondId).toBe(2);
    expect(store.enabledCount()).toBe(1);
    expect(store.hasEnabledSubscribers()).toBe(true);
    expect(store.isConnected()).toBe(false);

    store.setConnected(true);
    expect(store.isConnected()).toBe(true);
    expect(firstSetConnected).toHaveBeenCalledWith(true);
    expect(secondSetConnected).toHaveBeenCalledWith(true);

    store.setConnected(true);
    expect(firstSetConnected).toHaveBeenCalledTimes(1);
  });

  it('dispatches messages only to enabled subscribers', () => {
    const store = new SharedRealtimeSubscriberStore();
    const firstMessage = jest.fn();
    const secondMessage = jest.fn();
    const thirdMessage = jest.fn();

    store.add({ enabled: true, onMessage: firstMessage, setConnected: jest.fn() });
    store.add({ enabled: false, onMessage: secondMessage, setConnected: jest.fn() });
    store.add({ enabled: true, onMessage: thirdMessage, setConnected: jest.fn() });

    store.dispatchMessage('payload');

    expect(firstMessage).toHaveBeenCalledWith('payload');
    expect(secondMessage).not.toHaveBeenCalled();
    expect(thirdMessage).toHaveBeenCalledWith('payload');
  });

  it('updates subscribers, ignores missing subscribers, and removes subscribers', () => {
    const store = new SharedRealtimeSubscriberStore();
    const onMessage = jest.fn();
    const onOpen = jest.fn();
    const onClose = jest.fn();
    const onError = jest.fn();

    const id = store.add({ enabled: false, setConnected: jest.fn() });
    store.update(id, {});
    store.update(id, { enabled: true, onClose, onError, onMessage, onOpen });
    store.update(999, { enabled: true });

    expect(store.enabledCount()).toBe(1);
    store.dispatchMessage('message');
    expect(onMessage).toHaveBeenCalledWith('message');

    const enabledSubscribers: unknown[] = [];
    store.forEachEnabled((subscriber) => {
      enabledSubscribers.push(subscriber);
      subscriber.onOpen?.();
      subscriber.onClose?.({});
      subscriber.onError?.(new Event('error'));
    });
    expect(enabledSubscribers).toHaveLength(1);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);

    store.remove(id);
    expect(store.enabledCount()).toBe(0);
    expect(store.hasEnabledSubscribers()).toBe(false);
  });
});
