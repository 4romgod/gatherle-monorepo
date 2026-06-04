import { fireEvent, render, screen } from '@testing-library/react';
import SocialAuthButtons from '@/components/forms/auth/SocialAuthButtons';
import { DEFAULT_LOGIN_REDIRECT } from '@/routes';

const mockSignIn = jest.fn();

jest.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

const useSearchParamsMock = jest.fn();

jest.mock('next/navigation', () => ({
  useSearchParams: () => useSearchParamsMock(),
}));

describe('SocialAuthButtons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSearchParamsMock.mockReturnValue({
      get: () => null,
    });
  });

  it('starts Google sign-in with the default redirect target', () => {
    render(<SocialAuthButtons />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(mockSignIn).toHaveBeenCalledWith(
      'google',
      { redirectTo: DEFAULT_LOGIN_REDIRECT },
      { prompt: 'select_account' },
    );
  });

  it('starts Apple sign-in with the default redirect target', () => {
    render(<SocialAuthButtons />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Apple' }));

    expect(mockSignIn).toHaveBeenCalledWith('apple', { redirectTo: DEFAULT_LOGIN_REDIRECT });
  });

  it('renders the email signup link when requested', () => {
    render(<SocialAuthButtons showEmailSignupButton />);

    expect(screen.getByRole('link', { name: 'Sign up with Email' }).getAttribute('href')).toBe('/auth/register');
  });

  it('uses a safe redirectTo query param for auth providers and signup', () => {
    useSearchParamsMock.mockReturnValue({
      get: (key: string) => (key === 'redirectTo' ? '/account/messages/gatherle-imports' : null),
    });

    render(<SocialAuthButtons showEmailSignupButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(mockSignIn).toHaveBeenCalledWith(
      'google',
      { redirectTo: '/account/messages/gatherle-imports' },
      { prompt: 'select_account' },
    );
    expect(screen.getByRole('link', { name: 'Sign up with Email' }).getAttribute('href')).toBe(
      '/auth/register?redirectTo=%2Faccount%2Fmessages%2Fgatherle-imports',
    );
  });
});
