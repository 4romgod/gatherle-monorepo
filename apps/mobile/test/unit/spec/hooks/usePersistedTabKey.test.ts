import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePersistedTabKey } from '@/hooks/core/usePersistedTabKey';
import { readStoredString, writeStoredString } from '@/lib/deviceStorage';

jest.mock('@/lib/deviceStorage', () => ({
  readStoredString: jest.fn(),
  writeStoredString: jest.fn(),
}));

const readStoredStringMock = readStoredString as jest.MockedFunction<typeof readStoredString>;
const writeStoredStringMock = writeStoredString as jest.MockedFunction<typeof writeStoredString>;

describe('usePersistedTabKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    readStoredStringMock.mockResolvedValue(null);
    writeStoredStringMock.mockResolvedValue(undefined);
  });

  it('restores a stored tab key when it is still valid', async () => {
    readStoredStringMock.mockResolvedValue('hosting');

    const { result } = renderHook(() =>
      usePersistedTabKey({
        availableKeys: ['going', 'past', 'hosting'],
        storageKey: 'tabs:account',
      }),
    );

    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    expect(readStoredStringMock).toHaveBeenCalledWith('tabs:account');
    expect(result.current.activeKey).toBe('hosting');
    expect(writeStoredStringMock).toHaveBeenCalledWith('tabs:account', 'hosting');
  });

  it('falls back to the first tab when the stored key is invalid and persists user changes', async () => {
    readStoredStringMock.mockResolvedValue('saved');

    const { result } = renderHook(() =>
      usePersistedTabKey({
        availableKeys: ['going', 'past', 'hosting'],
        storageKey: 'tabs:profile',
      }),
    );

    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    expect(result.current.activeKey).toBe('going');
    expect(writeStoredStringMock).toHaveBeenCalledWith('tabs:profile', 'going');

    await act(async () => {
      result.current.setActiveKey('past');
    });

    await waitFor(() => expect(result.current.activeKey).toBe('past'));
    expect(writeStoredStringMock).toHaveBeenLastCalledWith('tabs:profile', 'past');
  });

  it('honors an explicit initial key without waiting on storage', async () => {
    const { result } = renderHook(() =>
      usePersistedTabKey({
        availableKeys: ['going', 'past', 'hosting'],
        initialKey: 'past',
        storageKey: 'tabs:explicit',
      }),
    );

    expect(result.current.isHydrated).toBe(true);
    expect(result.current.activeKey).toBe('past');
    expect(readStoredStringMock).not.toHaveBeenCalled();
  });

  it('does not keep reapplying the same explicit initial key after the user changes tabs', async () => {
    const { result } = renderHook(() =>
      usePersistedTabKey({
        availableKeys: ['account', 'profile', 'session'],
        initialKey: 'account',
        storageKey: 'tabs:settings',
      }),
    );

    expect(result.current.activeKey).toBe('account');

    await act(async () => {
      result.current.setActiveKey('profile');
    });

    await waitFor(() => expect(result.current.activeKey).toBe('profile'));
    expect(writeStoredStringMock).toHaveBeenLastCalledWith('tabs:settings', 'profile');
  });

  it('applies a new explicit initial key when the caller changes it later', async () => {
    const { result, rerender } = renderHook(
      ({ initialKey }: { initialKey?: string }) =>
        usePersistedTabKey({
          availableKeys: ['account', 'profile', 'session'],
          initialKey,
          storageKey: 'tabs:settings',
        }),
      {
        initialProps: { initialKey: 'account' },
      },
    );

    expect(result.current.activeKey).toBe('account');

    await act(async () => {
      result.current.setActiveKey('profile');
    });

    await waitFor(() => expect(result.current.activeKey).toBe('profile'));

    rerender({ initialKey: 'session' });

    await waitFor(() => expect(result.current.activeKey).toBe('session'));
    expect(writeStoredStringMock).toHaveBeenLastCalledWith('tabs:settings', 'session');
  });

  it('does not write a stale tab into a new storage namespace before hydration completes', async () => {
    let resolveSecondRead: ((value: string | null) => void) | null = null;

    readStoredStringMock.mockImplementation((key: string) => {
      if (key === 'tabs:user-1') {
        return Promise.resolve('hosting');
      }

      return new Promise<string | null>((resolve) => {
        resolveSecondRead = resolve;
      });
    });

    const { result, rerender } = renderHook(
      ({ storageKey }: { storageKey: string }) =>
        usePersistedTabKey({
          availableKeys: ['going', 'past', 'hosting'],
          storageKey,
        }),
      {
        initialProps: { storageKey: 'tabs:user-1' },
      },
    );

    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    expect(result.current.activeKey).toBe('hosting');
    expect(writeStoredStringMock).toHaveBeenLastCalledWith('tabs:user-1', 'hosting');

    writeStoredStringMock.mockClear();
    rerender({ storageKey: 'tabs:user-2' });

    await waitFor(() => expect(result.current.isHydrated).toBe(false));
    expect(result.current.activeKey).toBe('going');
    expect(writeStoredStringMock).not.toHaveBeenCalled();

    await act(async () => {
      resolveSecondRead?.('past');
    });

    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    expect(result.current.activeKey).toBe('past');
    expect(writeStoredStringMock).toHaveBeenLastCalledWith('tabs:user-2', 'past');
  });
});
