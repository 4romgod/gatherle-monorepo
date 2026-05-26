import { render, screen } from '@testing-library/react';
import { PullToRefreshShell } from '@/components/core/PullToRefreshShell';

const useApolloClientMock = jest.fn();
const usePullToRefreshMock = jest.fn();
const refreshMock = jest.fn();

jest.mock('@apollo/client', () => ({
  useApolloClient: () => useApolloClientMock(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

jest.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: (...args: unknown[]) => usePullToRefreshMock(...args),
}));

describe('PullToRefreshShell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useApolloClientMock.mockReturnValue({
      reFetchObservableQueries: jest.fn(),
    });
  });

  it('uses no transform when the pull distance is zero', () => {
    usePullToRefreshMock.mockReturnValue({
      handlers: {},
      isPulling: false,
      isRefreshing: false,
      pullDistance: 0,
      readyToRefresh: false,
    });

    render(
      <PullToRefreshShell>
        <div>Child</div>
      </PullToRefreshShell>,
    );

    expect(window.getComputedStyle(screen.getByTestId('pull-to-refresh-shell-content')).transform).toBe('none');
  });

  it('translates content while the user is pulling down', () => {
    usePullToRefreshMock.mockReturnValue({
      handlers: {},
      isPulling: true,
      isRefreshing: false,
      pullDistance: 24,
      readyToRefresh: false,
    });

    render(
      <PullToRefreshShell>
        <div>Child</div>
      </PullToRefreshShell>,
    );

    expect(window.getComputedStyle(screen.getByTestId('pull-to-refresh-shell-content')).transform).toMatch(
      /translateY\(24px\)|matrix\(1, 0, 0, 1, 0, 24\)/,
    );
  });
});
