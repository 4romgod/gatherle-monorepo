import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AppErrorBoundary } from '@/components/core/AppErrorBoundary';

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    LinearGradient: ({ children, ...props }: { children?: unknown }) => React.createElement(View, props, children),
  };
});

describe('AppErrorBoundary', () => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders the app-wide fallback when a child throws', () => {
    const ThrowingChild = () => {
      throw new Error('boom');
    };

    render(
      <AppErrorBoundary isDark={false}>
        <ThrowingChild />
      </AppErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('resets the boundary when retry is pressed', () => {
    let shouldThrow = true;

    const RecoveringChild = () => {
      if (shouldThrow) {
        throw new Error('temporary failure');
      }

      return <Text>Recovered content</Text>;
    };

    render(
      <AppErrorBoundary isDark={false}>
        <RecoveringChild />
      </AppErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();

    shouldThrow = false;
    fireEvent.press(screen.getByText('Try again'));

    expect(screen.getByText('Recovered content')).toBeTruthy();
  });
});
