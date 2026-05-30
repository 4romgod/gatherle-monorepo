import { render } from '@testing-library/react';
import MobileBottomNav from '@/components/navigation/MobileBottomNav';

const mockUsePathname = jest.fn();
const mockUseSession = jest.fn();
const mockUseUnreadChatCount = jest.fn();
const mockUseUnreadNotificationCount = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

jest.mock('@/hooks', () => ({
  useUnreadChatCount: () => mockUseUnreadChatCount(),
  useUnreadNotificationCount: () => mockUseUnreadNotificationCount(),
}));

jest.mock('next/link', () => {
  const React = require('react');

  const MockLink = React.forwardRef(
    ({ children, href, ...props }: { children: React.ReactNode; href: string }, ref: React.Ref<HTMLAnchorElement>) => (
      <a ref={ref} href={href} {...props}>
        {children}
      </a>
    ),
  );

  MockLink.displayName = 'MockLink';

  return {
    __esModule: true,
    default: MockLink,
  };
});

function getNavLinks(): HTMLAnchorElement[] {
  return Array.from(document.querySelectorAll('a[aria-label]'));
}

function getSelectedNavLinks(): HTMLAnchorElement[] {
  return getNavLinks().filter((link) =>
    link.closest('.MuiBottomNavigationAction-root')?.classList.contains('Mui-selected'),
  );
}

describe('MobileBottomNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/home');
    mockUseUnreadChatCount.mockReturnValue({ unreadCount: 4 });
    mockUseUnreadNotificationCount.mockReturnValue({ unreadCount: 2 });
  });

  it('shows all five nav items for guests and routes protected tabs to login', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });

    render(<MobileBottomNav />);

    const links = getNavLinks();

    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
      'Home',
      'Events',
      'Moments',
      'Messages',
      'Notifications',
      'Account',
    ]);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/',
      '/events',
      '/moments',
      '/auth/login',
      '/auth/login',
      '/auth/login',
    ]);
  });

  it('renders messages before notifications for authenticated users', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          userId: 'user-1',
          token: 'token-1',
          username: 'alice',
          given_name: 'Alice',
        },
      },
      status: 'authenticated',
    });

    render(<MobileBottomNav />);

    const links = getNavLinks();

    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
      'Home',
      'Events',
      'Moments',
      'Messages',
      'Notifications',
      'Account',
    ]);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/',
      '/events',
      '/moments',
      '/account/messages',
      '/account/notifications',
      '/account',
    ]);
  });

  it('does not select a missing nav item on auth routes', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockUsePathname.mockReturnValue('/auth/login');
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });

    render(<MobileBottomNav />);

    expect(getSelectedNavLinks()).toHaveLength(0);
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
