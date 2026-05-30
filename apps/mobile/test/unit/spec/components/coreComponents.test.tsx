import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Image, Text, TextInput } from 'react-native';
import { ChatComposer } from '@/components/messages/thread/ChatComposer';
import { InlineButton } from '@/components/core/InlineButton';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
import { RemoteImage } from '@/components/core/RemoteImage';
import { StateNotice } from '@/components/core/StateNotice';

jest.mock('@/app/theme/AppThemeProvider', () => ({
  useAppTheme: () => ({
    theme: {
      colors: {
        border: '#d9dee7',
        primary: '#5850ec',
        primaryContrast: '#ffffff',
        primarySoft: '#ede9fe',
        secondary: '#ff7a1a',
        secondarySoft: '#ffedd5',
        error: '#f04438',
        heroText: '#ffffff',
        surface: '#ffffff',
        surfaceMuted: '#f8fafc',
        textMuted: '#98a2b3',
        textPrimary: '#0b1736',
        textSecondary: '#667085',
      },
    },
  }),
}));

function renderWithTheme(ui: React.ReactElement) {
  return render(ui);
}

describe('mobile core components', () => {
  it('renders and presses inline buttons across tones', () => {
    const onPress = jest.fn();
    renderWithTheme(
      <>
        <InlineButton label="Primary action" onPress={onPress} />
        <InlineButton compact label="Secondary action" onPress={onPress} tone="secondary" />
        <InlineButton label="Neutral action" onPress={onPress} tone="neutral" />
      </>,
    );

    fireEvent.press(screen.getByText('Primary action'));
    fireEvent.press(screen.getByText('Secondary action'));
    fireEvent.press(screen.getByText('Neutral action'));
    expect(onPress).toHaveBeenCalledTimes(3);
  });

  it('renders profile avatars from initials, image URLs, and icon fallback', () => {
    const view = renderWithTheme(
      <>
        <ProfileAvatar active label="Ada Lovelace" size={48} />
        <ProfileAvatar label="Inactive Person" size={42} />
        <ProfileAvatar imageUrl="https://example.com/avatar.png" label="Grace Hopper" size={40} />
        <ProfileAvatar size={36} />
        <ProfileAvatar active size={34} />
      </>,
    );

    expect(screen.getByText('AL')).toBeTruthy();
    expect(screen.getByText('IP')).toBeTruthy();
    expect(screen.getByText('GH')).toBeTruthy();
    expect(screen.getAllByText('user')).toHaveLength(2);

    fireEvent(view.UNSAFE_getByType(Image), 'error');
    expect(screen.getByText('GH')).toBeTruthy();
  });

  it('keeps remote image fallbacks visible until load and after failures', () => {
    const view = renderWithTheme(
      <RemoteImage
        fallback={<Text>Image fallback</Text>}
        uri="https://example.com/slow-image.png"
        style={{ height: 80, width: 120 }}
      />,
    );

    expect(screen.getByText('Image fallback')).toBeTruthy();
    fireEvent(view.UNSAFE_getByType(Image), 'error');
    expect(screen.getByText('Image fallback')).toBeTruthy();

    view.rerender(
      <RemoteImage
        fallback={<Text>Image fallback</Text>}
        uri="https://example.com/loaded-image.png"
        style={{ height: 80, width: 120 }}
      />,
    );

    fireEvent(view.UNSAFE_getByType(Image), 'load');
    expect(screen.queryByText('Image fallback')).toBeNull();
  });

  it('retries remote image failures twice before surfacing a terminal error', () => {
    jest.useFakeTimers();
    const onError = jest.fn();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      const view = renderWithTheme(
        <RemoteImage
          fallback={<Text>Image fallback</Text>}
          onError={onError}
          uri="https://example.com/flaky-image.png"
          style={{ height: 80, width: 120 }}
        />,
      );

      const emitFailure = () => fireEvent(view.UNSAFE_getByType(Image), 'error');

      emitFailure();
      expect(onError).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenNthCalledWith(
        1,
        '[RemoteImage] Retrying remote image load',
        expect.objectContaining({
          attempt: 1,
          uri: 'https://example.com/flaky-image.png',
        }),
      );

      act(() => {
        jest.advanceTimersByTime(1500);
      });

      emitFailure();
      expect(onError).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenNthCalledWith(
        2,
        '[RemoteImage] Retrying remote image load',
        expect.objectContaining({
          attempt: 2,
          uri: 'https://example.com/flaky-image.png',
        }),
      );

      act(() => {
        jest.advanceTimersByTime(1500);
      });

      emitFailure();
      expect(onError).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenNthCalledWith(
        3,
        '[RemoteImage] Failed to load remote image',
        expect.objectContaining({
          retryCount: 2,
          uri: 'https://example.com/flaky-image.png',
        }),
      );
      expect(screen.getByText('Image fallback')).toBeTruthy();
    } finally {
      warnSpy.mockRestore();
      jest.useRealTimers();
    }
  });

  it('renders state notice action only when label and handler are present', () => {
    const onPress = jest.fn();
    const { rerender } = renderWithTheme(
      <StateNotice actionLabel="Retry" message="Something failed" onPressAction={onPress} />,
    );

    expect(screen.getByText('Something failed')).toBeTruthy();
    fireEvent.press(screen.getByText('Retry'));
    expect(onPress).toHaveBeenCalledTimes(1);

    rerender(<StateNotice actionLabel="Retry" message="No handler" />);
    expect(screen.getByText('No handler')).toBeTruthy();
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('uses multiline newline input behavior for chat composers', async () => {
    const onSend = jest.fn(() => true);
    const view = renderWithTheme(<ChatComposer isConnected onSend={onSend} targetUserId="user-1" />);

    const input = view.UNSAFE_getByType(TextInput);
    expect(input.props.multiline).toBe(true);
    expect(input.props.submitBehavior).toBe('newline');
    await waitFor(() => expect(screen.getByLabelText('Send message')).toBeTruthy());

    fireEvent.changeText(input, 'Hello there');
    fireEvent.press(screen.getByLabelText('Send message'));

    expect(onSend).toHaveBeenCalledWith('Hello there');
  });
});
