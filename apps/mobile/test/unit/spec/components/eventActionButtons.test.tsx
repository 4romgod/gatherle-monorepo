import { render, fireEvent } from '@testing-library/react-native';
import { ActivityIndicator } from 'react-native';
import { EventCardActionButton } from '@/components/events/card/EventCardActionButton';
import { EventDetailActionButton } from '@/components/events/detail/EventDetailActionButton';

jest.mock('@/app/theme/AppThemeProvider', () => ({
  useAppTheme: () => ({
    theme: {
      colors: {
        border: '#d9dee7',
        primary: '#5850ec',
        primaryContrast: '#ffffff',
        primarySoft: '#ede9fe',
        secondary: '#0b1736',
        success: '#12b76a',
        successSoft: '#dcfae6',
        surface: '#ffffff',
        surfaceMuted: '#f8fafc',
        textPrimary: '#0b1736',
        textSecondary: '#667085',
      },
    },
  }),
}));

describe('event action buttons', () => {
  it('shows a busy state and blocks presses on card actions while loading', () => {
    const onPress = jest.fn();
    const { getByRole, UNSAFE_getByType } = render(
      <EventCardActionButton icon="bookmark" loading onPress={onPress} tone="primary" />,
    );

    const button = getByRole('button');
    fireEvent.press(button);

    expect(button.props.accessibilityState).toEqual({ busy: true, disabled: true });
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('keeps the label visible and shows a spinner on detail actions while loading', () => {
    const onPress = jest.fn();
    const { getByRole, getByText, UNSAFE_getByType } = render(
      <EventDetailActionButton icon="bookmark" label="Save" loading onPress={onPress} tone="primarySoft" />,
    );

    const button = getByRole('button');
    fireEvent.press(button);

    expect(button.props.accessibilityState).toEqual({ busy: true, disabled: true });
    expect(getByText('Save')).toBeTruthy();
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    expect(onPress).not.toHaveBeenCalled();
  });
});
