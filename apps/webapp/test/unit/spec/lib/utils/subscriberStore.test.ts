import { SharedRealtimeSubscriberStore } from '@/lib/utils/realtime/subscriberStore';
import type { SharedRealtimeSubscriber } from '@/lib/utils/realtime/types';

const makeSubscriber = (overrides: Partial<SharedRealtimeSubscriber> = {}): SharedRealtimeSubscriber => ({
  enabled: true,
  setConnected: jest.fn(),
  ...overrides,
});

describe('SharedRealtimeSubscriberStore', () => {
  let store: SharedRealtimeSubscriberStore;

  beforeEach(() => {
    store = new SharedRealtimeSubscriberStore();
  });

  describe('isConnected / setConnected', () => {
    it('is disconnected by default', () => {
      expect(store.isConnected()).toBe(false);
    });

    it('notifies all subscribers when connected changes to true', () => {
      const sub1 = makeSubscriber();
      const sub2 = makeSubscriber();
      store.add(sub1);
      store.add(sub2);

      store.setConnected(true);

      expect(sub1.setConnected).toHaveBeenCalledWith(true);
      expect(sub2.setConnected).toHaveBeenCalledWith(true);
      expect(store.isConnected()).toBe(true);
    });

    it('notifies all subscribers when connected changes back to false', () => {
      const sub1 = makeSubscriber();
      store.add(sub1);

      store.setConnected(true);
      (sub1.setConnected as jest.Mock).mockClear();

      store.setConnected(false);

      expect(sub1.setConnected).toHaveBeenCalledWith(false);
      expect(store.isConnected()).toBe(false);
    });

    it('does not notify subscribers when connected does not change', () => {
      const sub = makeSubscriber();
      store.add(sub);

      store.setConnected(false); // already false
      expect(sub.setConnected).not.toHaveBeenCalled();

      store.setConnected(true);
      (sub.setConnected as jest.Mock).mockClear();

      store.setConnected(true); // already true
      expect(sub.setConnected).not.toHaveBeenCalled();
    });
  });

  describe('enabledCount / hasEnabledSubscribers', () => {
    it('returns 0 when empty', () => {
      expect(store.enabledCount()).toBe(0);
      expect(store.hasEnabledSubscribers()).toBe(false);
    });

    it('counts only enabled subscribers', () => {
      store.add(makeSubscriber({ enabled: true }));
      store.add(makeSubscriber({ enabled: false }));
      store.add(makeSubscriber({ enabled: true }));

      expect(store.enabledCount()).toBe(2);
      expect(store.hasEnabledSubscribers()).toBe(true);
    });

    it('returns false when all subscribers are disabled', () => {
      store.add(makeSubscriber({ enabled: false }));
      store.add(makeSubscriber({ enabled: false }));

      expect(store.hasEnabledSubscribers()).toBe(false);
    });
  });

  describe('add', () => {
    it('returns incrementing IDs', () => {
      const id1 = store.add(makeSubscriber());
      const id2 = store.add(makeSubscriber());
      const id3 = store.add(makeSubscriber());

      expect(id1).toBe(1);
      expect(id2).toBe(2);
      expect(id3).toBe(3);
    });
  });

  describe('update', () => {
    it('updates enabled flag', () => {
      const sub = makeSubscriber({ enabled: true });
      const id = store.add(sub);

      store.update(id, { enabled: false });

      expect(sub.enabled).toBe(false);
    });

    it('updates onMessage callback', () => {
      const sub = makeSubscriber();
      const id = store.add(sub);
      const newOnMessage = jest.fn();

      store.update(id, { onMessage: newOnMessage });

      expect(sub.onMessage).toBe(newOnMessage);
    });

    it('updates onOpen callback', () => {
      const sub = makeSubscriber();
      const id = store.add(sub);
      const newOnOpen = jest.fn();

      store.update(id, { onOpen: newOnOpen });

      expect(sub.onOpen).toBe(newOnOpen);
    });

    it('updates onClose callback', () => {
      const sub = makeSubscriber();
      const id = store.add(sub);
      const newOnClose = jest.fn();

      store.update(id, { onClose: newOnClose });

      expect(sub.onClose).toBe(newOnClose);
    });

    it('updates onError callback', () => {
      const sub = makeSubscriber();
      const id = store.add(sub);
      const newOnError = jest.fn();

      store.update(id, { onError: newOnError });

      expect(sub.onError).toBe(newOnError);
    });

    it('does nothing for unknown subscriber ID', () => {
      // Should not throw
      expect(() => store.update(999, { enabled: false })).not.toThrow();
    });

    it('allows setting onMessage to undefined explicitly', () => {
      const onMsg = jest.fn();
      const sub = makeSubscriber({ onMessage: onMsg });
      const id = store.add(sub);

      store.update(id, { onMessage: undefined });

      expect(sub.onMessage).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('removes a subscriber so it no longer receives messages', () => {
      const onMsg = jest.fn();
      const sub = makeSubscriber({ onMessage: onMsg });
      const id = store.add(sub);

      store.remove(id);
      store.dispatchMessage('hello');

      expect(onMsg).not.toHaveBeenCalled();
    });

    it('does not throw removing non-existent ID', () => {
      expect(() => store.remove(999)).not.toThrow();
    });

    it('updates hasEnabledSubscribers after removal', () => {
      const id = store.add(makeSubscriber({ enabled: true }));
      expect(store.hasEnabledSubscribers()).toBe(true);

      store.remove(id);
      expect(store.hasEnabledSubscribers()).toBe(false);
    });
  });

  describe('forEachEnabled', () => {
    it('only iterates enabled subscribers', () => {
      const enabledSub = makeSubscriber({ enabled: true });
      const disabledSub = makeSubscriber({ enabled: false });
      store.add(enabledSub);
      store.add(disabledSub);

      const visited: SharedRealtimeSubscriber[] = [];
      store.forEachEnabled((s) => visited.push(s));

      expect(visited).toContain(enabledSub);
      expect(visited).not.toContain(disabledSub);
    });
  });

  describe('dispatchMessage', () => {
    it('dispatches messages only to enabled subscribers with onMessage', () => {
      const onMsgA = jest.fn();
      const onMsgB = jest.fn();
      store.add(makeSubscriber({ enabled: true, onMessage: onMsgA }));
      store.add(makeSubscriber({ enabled: false, onMessage: onMsgB }));

      store.dispatchMessage('{"type":"ping"}');

      expect(onMsgA).toHaveBeenCalledWith('{"type":"ping"}');
      expect(onMsgB).not.toHaveBeenCalled();
    });

    it('does nothing when there are no subscribers', () => {
      expect(() => store.dispatchMessage('data')).not.toThrow();
    });

    it('dispatches to multiple enabled subscribers', () => {
      const onMsg1 = jest.fn();
      const onMsg2 = jest.fn();
      store.add(makeSubscriber({ onMessage: onMsg1 }));
      store.add(makeSubscriber({ onMessage: onMsg2 }));

      store.dispatchMessage('test');

      expect(onMsg1).toHaveBeenCalledWith('test');
      expect(onMsg2).toHaveBeenCalledWith('test');
    });
  });
});
