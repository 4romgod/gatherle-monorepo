import { fireEvent, render, screen } from '@testing-library/react';
import AuthPageShell from '@/components/forms/auth/AuthPageShell';

const mockUseAppContext = jest.fn();
const mockSetThemeMode = jest.fn();

jest.mock('@/hooks/useAppContext', () => ({
  useAppContext: () => mockUseAppContext(),
}));

jest.mock('@/components/logo', () => () => <div data-testid="auth-logo" />);

describe('AuthPageShell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppContext.mockReturnValue({
      themeMode: 'light',
      setThemeMode: mockSetThemeMode,
    });
  });

  it('renders guest auth copy and exposes a mobile theme toggle', () => {
    render(
      <AuthPageShell subtitle="Sign in to your account to continue" title="Welcome back">
        <div>Auth body</div>
      </AuthPageShell>,
    );

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeTruthy();
    expect(screen.getByText('Sign in to your account to continue')).toBeTruthy();
    expect(screen.getByText('Auth body')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Switch to dark mode'));

    expect(mockSetThemeMode).toHaveBeenCalledTimes(1);
    expect(mockSetThemeMode.mock.calls[0][0]('light')).toBe('dark');
    expect(mockSetThemeMode.mock.calls[0][0]('dark')).toBe('light');
  });
});
