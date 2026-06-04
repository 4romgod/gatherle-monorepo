import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MockedProvider } from '@apollo/client/testing';
import ProfileEventsTabs from '@/components/users/ProfileEventsTabs';

jest.mock('@mui/material', () => {
  const actual = jest.requireActual('@mui/material');

  return {
    ...actual,
    Tooltip: ({ title, children }: { title: ReactNode; children: ReactNode }) => (
      <div data-testid="tooltip" data-title={String(title)}>
        {children}
      </div>
    ),
  };
});

jest.mock('@/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: jest.fn(() => null),
}));

jest.mock('@/components/users/ProfileEventTile', () => ({
  __esModule: true,
  default: ({ event }: { event: { title: string } }) => <div>{event.title}</div>,
}));

describe('ProfileEventsTabs', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const renderWithProviders = (ui: React.ReactElement) => render(<MockedProvider>{ui}</MockedProvider>);

  it('uses viewer-correct tooltip copy on another user profile', () => {
    renderWithProviders(
      <ProfileEventsTabs upcomingRsvpdEvents={[]} pastRsvpdEvents={[]} organizedEvents={[]} isOwnProfile={false} />,
    );

    const tooltipTitles = screen.getAllByTestId('tooltip').map((node) => node.getAttribute('data-title'));

    expect(tooltipTitles).toContain("RSVPs — events they've locked in");
    expect(tooltipTitles).toContain('Attended — past events they showed up for');
    expect(tooltipTitles).toContain("Hosted — events they've created or co-hosted");
  });

  it('shows labels and embedded counts in the tab controls', () => {
    renderWithProviders(
      <ProfileEventsTabs
        upcomingRsvpdEvents={[{ eventId: 'upcoming-1', title: 'Upcoming One' } as any]}
        pastRsvpdEvents={[
          { eventId: 'past-1', title: 'Past One' } as any,
          { eventId: 'past-2', title: 'Past Two' } as any,
        ]}
        organizedEvents={[]}
        hostedEventsTotalCount={12}
        savedEvents={[{ eventId: 'saved-1', title: 'Saved One' } as any]}
        isOwnProfile
      />,
    );

    expect(screen.getByText('RSVPs')).toBeTruthy();
    expect(screen.getByText('Attended')).toBeTruthy();
    expect(screen.getByText('Hosted')).toBeTruthy();
    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
  });

  it('renders hosted-event search controls on the hosted tab for your own account', () => {
    renderWithProviders(
      <ProfileEventsTabs
        initialTabKey="hosted"
        hostedEventsSearchTerm=""
        hostedEventsTotalCount={4}
        onHostedEventsSearchChange={jest.fn()}
        upcomingRsvpdEvents={[]}
        pastRsvpdEvents={[]}
        organizedEvents={[]}
        isOwnProfile
      />,
    );

    expect(screen.getByPlaceholderText(/search hosted events/i)).toBeTruthy();
    expect(screen.getByText('0 of 4 hosted events')).toBeTruthy();
  });

  it('restores the persisted tab selection for the current viewer', () => {
    window.localStorage.setItem('gatherle:sessionstate:viewer-1:profile-events-tabs', JSON.stringify({ value: 2 }));

    renderWithProviders(
      <ProfileEventsTabs
        tabPersistence={{ key: 'profile-events-tabs', userId: 'viewer-1' }}
        hostedEventsSearchTerm=""
        hostedEventsTotalCount={4}
        onHostedEventsSearchChange={jest.fn()}
        upcomingRsvpdEvents={[]}
        pastRsvpdEvents={[]}
        organizedEvents={[]}
        isOwnProfile
      />,
    );

    expect(screen.getByPlaceholderText(/search hosted events/i)).toBeTruthy();
    expect(screen.getByText('0 of 4 hosted events')).toBeTruthy();
  });

  it('persists the selected tab index when the viewer switches tabs', () => {
    renderWithProviders(
      <ProfileEventsTabs
        tabPersistence={{ key: 'profile-events-tabs', userId: 'viewer-1' }}
        upcomingRsvpdEvents={[]}
        pastRsvpdEvents={[]}
        organizedEvents={[]}
        isOwnProfile={false}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Hosted' }));

    expect(window.localStorage.getItem('gatherle:sessionstate:viewer-1:profile-events-tabs')).toBe(
      JSON.stringify({ value: 2 }),
    );
  });
});
