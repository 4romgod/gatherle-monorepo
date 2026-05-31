import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import EventOperationsModal from '@/components/core/modal/EventOperationsModal';

const mockUseSession = jest.fn();
const mockReplace = jest.fn();
const mockSetToastProps = jest.fn();

jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock('@/hooks/useAppContext', () => ({
  useAppContext: () => ({
    setToastProps: mockSetToastProps,
    toastProps: {},
  }),
}));

jest.mock('@/data/actions/server/events/delete-event', () => ({
  deleteEventAction: jest.fn(),
}));

describe('EventOperationsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: {
        user: {
          token: 'token',
          username: 'owner',
        },
      },
    });
  });

  it('shows explicit series/session actions for organizers', () => {
    render(
      <EventOperationsModal
        canEditEvent
        event={
          { eventId: 'event-1', slug: 'cape-town-wellness-immersion', title: 'Cape Town Wellness Immersion' } as any
        }
        selectedOccurrence={
          {
            occurrenceId: 'occ-1',
            originalStartAt: '2026-05-29T06:00:00.000Z',
            startAt: '2026-05-29T06:00:00.000Z',
          } as any
        }
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /event options/i }));

    expect(screen.getByRole('link', { name: /manage event sessions/i }).getAttribute('href')).toBe(
      '/account/events/cape-town-wellness-immersion/sessions?occurs=2026-05-29T06%3A00%3A00.000Z',
    );
    expect(screen.getByRole('link', { name: /edit event session/i }).getAttribute('href')).toBe(
      '/account/events/cape-town-wellness-immersion/sessions?occurs=2026-05-29T06%3A00%3A00.000Z&action=edit',
    );
    expect(screen.getByRole('link', { name: /edit event series/i }).getAttribute('href')).toBe(
      '/account/events/cape-town-wellness-immersion/edit',
    );
    expect(screen.getByRole('link', { name: /cancel event session/i }).getAttribute('href')).toBe(
      '/account/events/cape-town-wellness-immersion/sessions?occurs=2026-05-29T06%3A00%3A00.000Z&action=cancel',
    );
    expect(screen.getByText('Copy Event Session Link')).toBeTruthy();
    expect(screen.getByText('Delete Event Series')).toBeTruthy();
  });
});
