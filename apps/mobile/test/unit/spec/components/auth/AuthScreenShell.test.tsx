import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { ScrollView, Text } from 'react-native';
import { AuthScreenShell } from '@/components/auth/AuthScreenShell';

jest.mock('@/app/theme/AppThemeProvider', () => ({
  useAppTheme: () => ({
    theme: {
      colors: {
        background: '#ffffff',
        textPrimary: '#111111',
        textSecondary: '#666666',
      },
    },
  }),
}));

jest.mock('@/components/core/BrandMark', () => ({
  BrandMark: () => {
    const { Text: MockText } = require('react-native');
    return <MockText>Brand mark</MockText>;
  },
}));

jest.mock('@/components/core/KeyboardAwareScrollView', () => ({
  KeyboardAwareScrollView: ({ children }: { children: ReactNode }) => {
    const { ScrollView: MockScrollView } = require('react-native');
    return <MockScrollView>{children}</MockScrollView>;
  },
}));

jest.mock('@/components/core/ThemeModeButton', () => ({
  ThemeModeButton: () => {
    const { Text: MockText } = require('react-native');
    return <MockText>Theme toggle</MockText>;
  },
}));

describe('AuthScreenShell', () => {
  it('renders the guest theme toggle alongside auth copy', () => {
    const { getByText } = render(
      <AuthScreenShell subtitle="Sign in to your account to continue." title="Welcome back">
        <Text>Auth body</Text>
      </AuthScreenShell>,
    );

    expect(getByText('Brand mark')).toBeTruthy();
    expect(getByText('Theme toggle')).toBeTruthy();
    expect(getByText('Welcome back')).toBeTruthy();
    expect(getByText('Sign in to your account to continue.')).toBeTruthy();
    expect(getByText('Auth body')).toBeTruthy();
  });
});
