import { fireEvent, render, screen } from '@testing-library/react-native';
import { InlineButton } from '@/components/core/InlineButton';
import { ProfileAvatar } from '@/components/core/ProfileAvatar';
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
    renderWithTheme(
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
    expect(screen.getAllByText('user')).toHaveLength(2);
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
});
