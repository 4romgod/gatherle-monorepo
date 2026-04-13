import React from 'react';
import { render, screen } from '@testing-library/react';
import HomePage from '@/app/home/page';
import { auth } from '@/auth';

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/components/home/PersonalizedHome', () => ({
  __esModule: true,
  default: ({ user }: { user: { id: string; name?: string } }) => (
    <div data-testid="personalized-home">{`${user.id}:${user.name ?? ''}`}</div>
  ),
}));

describe('/home page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the personalized home for an authenticated user with userId', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: {
        userId: 'user-123',
        name: 'OAuth User',
        email: 'user@example.com',
      },
    });

    const page = await HomePage();
    render(page as React.ReactElement);

    expect(screen.getByTestId('personalized-home').textContent).toBe('user-123:OAuth User');
  });

  it('returns null when there is no authenticated userId', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: {
        name: 'OAuth User',
      },
    });

    await expect(HomePage()).resolves.toBeNull();
  });
});
