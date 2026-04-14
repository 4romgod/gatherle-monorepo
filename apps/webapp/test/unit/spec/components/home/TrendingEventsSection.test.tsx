import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import TrendingEventsSection from '@/components/home/TrendingEventsSection';

const mockUseSession = jest.fn();
const mockUseQuery = jest.fn();
const mockGetAuthHeader = jest.fn();

jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('@/lib/utils', () => ({
  getAuthHeader: (...args: unknown[]) => mockGetAuthHeader(...args),
}));

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>;
  MockLink.displayName = 'MockLink';
  return MockLink;
});

jest.mock('@/components/events/EventTileGrid', () => {
  const MockEventTileGrid = ({ events }: { events: unknown[] }) => (
    <div data-testid="event-tile-grid" data-count={events.length} />
  );
  MockEventTileGrid.displayName = 'MockEventTileGrid';
  return MockEventTileGrid;
});

jest.mock('@/components/events/eventBox/EventBoxSkeleton', () => {
  const MockEventBoxSkeleton = () => <div data-testid="event-box-skeleton" />;
  MockEventBoxSkeleton.displayName = 'MockEventBoxSkeleton';
  return MockEventBoxSkeleton;
});

const mockEvents = [
  { eventId: 'event-1', title: 'Event One' },
  { eventId: 'event-2', title: 'Event Two' },
];

describe('TrendingEventsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthHeader.mockReturnValue({ Authorization: 'Bearer token-1' });
    mockUseSession.mockReturnValue({ data: { user: { token: 'token-1' } } });
  });

  it('renders the section heading', () => {
    mockUseQuery.mockReturnValue({ data: { readTrendingEvents: mockEvents }, loading: false, error: undefined });

    render(<TrendingEventsSection />);

    expect(screen.getByText('Trending Events')).toBeTruthy();
  });

  it('renders skeleton placeholders while loading and no data is available yet', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: true, error: undefined });

    render(<TrendingEventsSection />);

    const skeletons = screen.getAllByTestId('event-box-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders the event tile grid when events are returned', () => {
    mockUseQuery.mockReturnValue({ data: { readTrendingEvents: mockEvents }, loading: false, error: undefined });

    render(<TrendingEventsSection />);

    const grid = screen.getByTestId('event-tile-grid');
    expect(grid).toBeTruthy();
    expect(grid.getAttribute('data-count')).toBe(String(mockEvents.length));
  });

  it('renders an empty-state message when the query returns no events', () => {
    mockUseQuery.mockReturnValue({ data: { readTrendingEvents: [] }, loading: false, error: undefined });

    render(<TrendingEventsSection />);

    expect(screen.getByText(/no trending events/i)).toBeTruthy();
  });

  it('renders an error message when the query fails', () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: false, error: new Error('network error') });

    render(<TrendingEventsSection />);

    expect(screen.getByText(/failed to load trending events/i)).toBeTruthy();
  });

  it('does not show skeleton when data is available even if loading is still true (cache-and-network)', () => {
    // loading=true but data present → isLoading = loading && !data = false
    mockUseQuery.mockReturnValue({ data: { readTrendingEvents: mockEvents }, loading: true, error: undefined });

    render(<TrendingEventsSection />);

    expect(screen.queryByTestId('event-box-skeleton')).toBeNull();
    expect(screen.getByTestId('event-tile-grid')).toBeTruthy();
  });

  it('calls useQuery with the ReadTrendingEventsDocument and limit: 4', () => {
    mockUseQuery.mockReturnValue({ data: { readTrendingEvents: [] }, loading: false, error: undefined });

    render(<TrendingEventsSection />);

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.anything(), // the document
      expect.objectContaining({ variables: { limit: 4 } }),
    );
  });
});
