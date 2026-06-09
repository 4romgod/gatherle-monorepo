import { fireEvent, render, screen, within } from '@testing-library/react';
import AdminDashboard from '@/components/admin/AdminDashboard';

const mockPush = jest.fn();
let mockTabParam: string | null = null;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'tab' ? mockTabParam : null),
  }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock('@/components/admin/AdminStatsPanel', () => ({
  __esModule: true,
  default: () => <div>Overview content</div>,
}));

jest.mock('@/components/admin/AdminEventsSection', () => ({
  __esModule: true,
  default: () => <div>Events content</div>,
}));

jest.mock('@/components/admin/AdminDevicesSection', () => ({
  __esModule: true,
  default: () => <div>Devices content</div>,
}));

jest.mock('@/components/admin/AdminOrganizationsSection', () => ({
  __esModule: true,
  default: () => <div>Organizations content</div>,
}));

jest.mock('@/components/admin/AdminVenuesSection', () => ({
  __esModule: true,
  default: () => <div>Venues content</div>,
}));

jest.mock('@/components/admin/AdminUsersSection', () => ({
  __esModule: true,
  default: () => <div>Users content</div>,
}));

jest.mock('@/components/admin/AdminCategorySection', () => ({
  __esModule: true,
  default: () => <div>Categories content</div>,
}));

jest.mock('@/components/admin/AdminCategoryGroupSection', () => ({
  __esModule: true,
  default: () => <div>Groups content</div>,
}));

describe('AdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTabParam = null;
  });

  it('renders the hub with overview metrics and domain links by default', () => {
    mockTabParam = null;

    render(<AdminDashboard token="token" currentUserId="user-1" />);

    expect(screen.getAllByText('Overview content').length).toBeGreaterThan(0);
    expect(screen.getByText('Manage domains')).toBeTruthy();
    const nav = screen.getByRole('navigation', { name: /admin domains/i });
    expect(within(nav).getByText('Devices')).toBeTruthy();
    expect(within(nav).getByText('Events')).toBeTruthy();
    expect(within(nav).getByText('Organizations')).toBeTruthy();
    expect(within(nav).getByText('Users')).toBeTruthy();
  });

  it('renders the matching section when a tab query param is provided', () => {
    mockTabParam = 'devices';

    render(<AdminDashboard token="token" currentUserId="user-1" />);

    expect(screen.getAllByText('Devices content').length).toBeGreaterThan(0);
  });

  it('falls back to the overview hub when the tab query param is unknown', () => {
    mockTabParam = 'legacy-session-states';

    render(<AdminDashboard token="token" currentUserId="user-1" />);

    expect(screen.getAllByText('Overview content').length).toBeGreaterThan(0);
    expect(screen.getByText('Manage domains')).toBeTruthy();
    expect(screen.getByText('Choose a domain to manage, or review the platform snapshot below.')).toBeTruthy();
  });

  it('navigates via router.push when a desktop tab is selected', () => {
    mockTabParam = 'overview';

    render(<AdminDashboard token="token" currentUserId="user-1" />);

    fireEvent.click(screen.getAllByRole('tab', { name: /users/i })[0]);
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('tab=users'), { scroll: false });
  });
});
