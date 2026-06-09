import { APP_ACCESS_BLOCKED_ERROR_CODE, ERROR_MESSAGES } from '@gatherle/commons/client/constants';
import { redirect } from 'next/navigation';
import {
  clearBlockedAccountMessage,
  getAppAccessBlockedMessage,
  isAppAccessBlockedError,
  notifyAppAccessBlocked,
  readBlockedAccountMessage,
  storeBlockedAccountMessage,
  subscribeToAppAccessBlocked,
} from '@/lib/utils/app-access-block';
import { redirectIfAppAccessBlocked } from '@/lib/utils/app-access-block-server';
import { ROUTES } from '@/lib/constants';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

describe('app access block utilities', () => {
  const redirectMock = redirect as jest.Mock;

  beforeEach(() => {
    redirectMock.mockReset();
    window.sessionStorage.clear();
  });

  it('detects blocked GraphQL errors and resolves the best available message', () => {
    const graphQLError = {
      graphQLErrors: [
        { message: 'Unauthenticated', extensions: { code: 'UNAUTHENTICATED' } },
        { message: 'Blocked by admin', extensions: { code: APP_ACCESS_BLOCKED_ERROR_CODE } },
      ],
    };
    const networkError = {
      graphQLErrors: [],
      networkError: {
        result: {
          errors: [
            { message: 'Forbidden', extensions: { code: 'FORBIDDEN' } },
            { message: 'Blocked over network', extensions: { code: APP_ACCESS_BLOCKED_ERROR_CODE } },
          ],
        },
      },
    };

    expect(isAppAccessBlockedError(graphQLError)).toBe(true);
    expect(isAppAccessBlockedError(networkError)).toBe(true);
    expect(getAppAccessBlockedMessage(graphQLError)).toBe('Blocked by admin');
    expect(getAppAccessBlockedMessage(networkError)).toBe('Blocked over network');
    expect(getAppAccessBlockedMessage({})).toBe(ERROR_MESSAGES.APP_ACCESS_BLOCKED);
  });

  it('stores, reads, and clears the blocked-account message in session storage', () => {
    expect(readBlockedAccountMessage()).toBeNull();

    storeBlockedAccountMessage('  Blocked by moderation  ');
    expect(readBlockedAccountMessage()).toBe('Blocked by moderation');

    clearBlockedAccountMessage();
    expect(readBlockedAccountMessage()).toBeNull();

    storeBlockedAccountMessage('');
    expect(readBlockedAccountMessage()).toBe(ERROR_MESSAGES.APP_ACCESS_BLOCKED);
  });

  it('notifies subscribers with normalized block messages', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToAppAccessBlocked(listener);

    notifyAppAccessBlocked('  Temporarily blocked  ');
    notifyAppAccessBlocked('');

    unsubscribe();
    notifyAppAccessBlocked('Ignored after unsubscribe');

    expect(listener).toHaveBeenNthCalledWith(1, 'Temporarily blocked');
    expect(listener).toHaveBeenNthCalledWith(2, ERROR_MESSAGES.APP_ACCESS_BLOCKED);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('redirects server-side callers to the blocked-account route only for blocked errors', () => {
    redirectIfAppAccessBlocked({
      graphQLErrors: [{ message: 'Blocked by admin', extensions: { code: APP_ACCESS_BLOCKED_ERROR_CODE } }],
    });
    expect(redirectMock).toHaveBeenCalledWith(ROUTES.ACCOUNT_BLOCKED);

    redirectMock.mockClear();
    redirectIfAppAccessBlocked({
      graphQLErrors: [{ message: 'Unauthenticated', extensions: { code: 'UNAUTHENTICATED' } }],
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
