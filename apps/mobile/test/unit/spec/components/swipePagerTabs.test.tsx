import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ScrollView, Text } from 'react-native';
import { SwipePagerTabs } from '@/components/core/SwipePagerTabs';
import { readStoredString, writeStoredString } from '@/lib/deviceStorage';

jest.mock('@/app/theme/AppThemeProvider', () => ({
  useAppTheme: () => ({
    theme: {
      colors: {
        border: '#d9dee7',
        primary: '#5850ec',
        surface: '#ffffff',
        surfaceMuted: '#f8fafc',
        textPrimary: '#0b1736',
        textSecondary: '#667085',
      },
    },
  }),
}));

jest.mock('@/lib/deviceStorage', () => ({
  DEVICE_STORAGE_KEYS: {
    tabSelection: 'gatherle.mobile.tab-selection',
  },
  readStoredString: jest.fn(),
  writeStoredString: jest.fn(),
}));

const readStoredStringMock = readStoredString as jest.MockedFunction<typeof readStoredString>;
const writeStoredStringMock = writeStoredString as jest.MockedFunction<typeof writeStoredString>;

describe('SwipePagerTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    readStoredStringMock.mockResolvedValue(null);
    writeStoredStringMock.mockResolvedValue(undefined);
  });

  it('switches tabs when a tab header is pressed and persists the new key', async () => {
    const onActiveKeyChange = jest.fn();

    render(
      <SwipePagerTabs
        onActiveKeyChange={onActiveKeyChange}
        persistenceKey="account-events:user-1"
        routes={[
          { icon: 'check-square', key: 'going', label: 'RSVPs', render: () => <Text>Going content</Text> },
          { icon: 'clock', key: 'past', label: 'Attended', render: () => <Text>Past content</Text> },
          { icon: 'calendar', key: 'hosting', label: 'Hosted', render: () => <Text>Hosted content</Text> },
        ]}
        variant="icon"
      />,
    );

    await waitFor(() => expect(onActiveKeyChange).toHaveBeenCalledWith('going'));

    onActiveKeyChange.mockClear();
    fireEvent.press(screen.getByText('Hosted'));

    await waitFor(() => expect(onActiveKeyChange).toHaveBeenCalledWith('hosting'));
    expect(writeStoredStringMock).toHaveBeenLastCalledWith(
      'gatherle.mobile.tab-selection:account-events:user-1',
      'hosting',
    );
  });

  it('ignores stale momentum events from the previous page after a tab press', async () => {
    const onActiveKeyChange = jest.fn();

    const { UNSAFE_getAllByType } = render(
      <SwipePagerTabs
        onActiveKeyChange={onActiveKeyChange}
        persistenceKey="account-settings:user-1"
        routes={[
          { key: 'account', label: 'Account', render: () => <Text>Account content</Text> },
          { key: 'profile', label: 'Profile', render: () => <Text>Profile content</Text> },
          { key: 'session', label: 'Session', render: () => <Text>Session content</Text> },
        ]}
        scrollableTabs
        variant="label"
      />,
    );

    await waitFor(() => expect(onActiveKeyChange).toHaveBeenCalledWith('account'));

    onActiveKeyChange.mockClear();
    fireEvent.press(screen.getByText('Profile'));

    await waitFor(() => expect(onActiveKeyChange).toHaveBeenCalledWith('profile'));

    const scrollViews = UNSAFE_getAllByType(ScrollView);
    const pagerScrollView = scrollViews[1];

    fireEvent(pagerScrollView, 'momentumScrollEnd', {
      nativeEvent: {
        contentOffset: { x: 0, y: 0 },
      },
    });

    expect(onActiveKeyChange).not.toHaveBeenCalledWith('account');
    expect(writeStoredStringMock).toHaveBeenLastCalledWith(
      'gatherle.mobile.tab-selection:account-settings:user-1',
      'profile',
    );
  });

  it('does not emit an active-tab callback before persisted state hydration completes', async () => {
    let resolveStoredKey: ((value: string | null) => void) | null = null;

    readStoredStringMock.mockImplementationOnce(
      () =>
        new Promise<string | null>((resolve) => {
          resolveStoredKey = resolve;
        }),
    );

    const onActiveKeyChange = jest.fn();

    render(
      <SwipePagerTabs
        onActiveKeyChange={onActiveKeyChange}
        persistenceKey="account-settings:user-2"
        routes={[
          { key: 'account', label: 'Account', render: () => <Text>Account content</Text> },
          { key: 'profile', label: 'Profile', render: () => <Text>Profile content</Text> },
          { key: 'session', label: 'Session', render: () => <Text>Session content</Text> },
        ]}
        scrollableTabs
        variant="label"
      />,
    );

    expect(onActiveKeyChange).not.toHaveBeenCalled();

    resolveStoredKey?.('session');

    await waitFor(() => expect(onActiveKeyChange).toHaveBeenCalledWith('session'));
    expect(onActiveKeyChange).not.toHaveBeenCalledWith('account');
  });
});
