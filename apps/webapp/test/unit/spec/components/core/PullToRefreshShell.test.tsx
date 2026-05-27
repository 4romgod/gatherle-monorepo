import { act, render, screen } from '@testing-library/react';
import { PullToRefreshShell } from '@/components/core/PullToRefreshShell';

const useApolloClientMock = jest.fn();
const usePullToRefreshMock = jest.fn();

jest.mock('@apollo/client', () => ({
  useApolloClient: () => useApolloClientMock(),
}));

jest.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: (...args: unknown[]) => usePullToRefreshMock(...args),
}));

describe('PullToRefreshShell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useApolloClientMock.mockReturnValue({
      reFetchObservableQueries: jest.fn().mockResolvedValue([]),
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

  it('refreshes active Apollo queries without forcing a route refresh when queries exist', async () => {
    let capturedOptions: { onRefresh: () => Promise<unknown> | unknown } | null = null;
    const reFetchObservableQueries = jest.fn().mockResolvedValue([{}]);

    useApolloClientMock.mockReturnValue({
      reFetchObservableQueries,
    });
    usePullToRefreshMock.mockImplementation((options) => {
      capturedOptions = options as { onRefresh: () => Promise<unknown> | unknown };
      return {
        handlers: {},
        isPulling: false,
        isRefreshing: false,
        pullDistance: 0,
        readyToRefresh: false,
      };
    });

    render(
      <PullToRefreshShell>
        <div>Child</div>
      </PullToRefreshShell>,
    );

    await act(async () => {
      await capturedOptions?.onRefresh();
    });

    expect(reFetchObservableQueries).toHaveBeenCalled();
  });

  it('keeps pull-to-refresh Apollo-driven even when there are no observable queries to refetch', async () => {
    let capturedOptions: { onRefresh: () => Promise<unknown> | unknown } | null = null;
    const reFetchObservableQueries = jest.fn().mockResolvedValue([]);

    useApolloClientMock.mockReturnValue({
      reFetchObservableQueries,
    });
    usePullToRefreshMock.mockImplementation((options) => {
      capturedOptions = options as { onRefresh: () => Promise<unknown> | unknown };
      return {
        handlers: {},
        isPulling: false,
        isRefreshing: false,
        pullDistance: 0,
        readyToRefresh: false,
      };
    });

    render(
      <PullToRefreshShell>
        <div>Child</div>
      </PullToRefreshShell>,
    );

    await act(async () => {
      await capturedOptions?.onRefresh();
    });

    expect(reFetchObservableQueries).toHaveBeenCalled();
  });
});
