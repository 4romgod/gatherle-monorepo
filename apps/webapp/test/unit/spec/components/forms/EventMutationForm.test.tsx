import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { useLazyQuery, useMutation } from '@apollo/client';
import { usePersistentState } from '@/hooks';
import EventMutationForm from '@/components/forms/eventMutation';
import { EventOrganizerRole, type EventCategory } from '@/data/graphql/types/graphql';

const mockPush = jest.fn();
const mockClearStorage = jest.fn();
const mockCreateEvent = jest.fn();
const mockUpdateEvent = jest.fn();
const mockLoadUsers = jest.fn();
const mockEventDateInput = jest.fn(() => <div data-testid="event-date-input" />);

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { token: 'mock-token', userId: 'user-123' } },
    status: 'authenticated',
  }),
}));

// Use plain strings so object identity matching works across the module boundary
jest.mock('@/data/graphql/query/Event/mutation', () => ({
  CreateEventDocument: 'CreateEventDocument',
  UpdateEventDocument: 'UpdateEventDocument',
}));

jest.mock('@/data/graphql/query/Organization/query', () => ({
  GetMyOrganizationsDocument: 'GetMyOrganizationsDocument',
}));

jest.mock('@apollo/client', () => ({
  useQuery: jest.fn(() => ({ data: null, loading: false })),
  useLazyQuery: jest.fn(),
  useMutation: jest.fn(),
}));

jest.mock('@/hooks/useMediaUpload', () => ({
  useMediaUpload: jest.fn(() => ({
    upload: jest.fn(),
    uploading: false,
    error: null,
    preview: null,
    reset: jest.fn(),
  })),
}));

jest.mock('@/hooks', () => ({
  usePersistentState: jest.fn(),
}));

jest.mock('@/hooks/usePersistentState', () => ({
  STORAGE_NAMESPACES: { EVENT_MUTATION: 'event_mutation' },
  usePersistentState: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/utils/auth', () => ({
  getAuthHeader: jest.fn(() => ({})),
}));

// Stub heavy child components
jest.mock('@/components/events/filters/category', () => ({
  __esModule: true,
  default: () => <div data-testid="category-filter" />,
}));

jest.mock('@/components/forms/eventMutation/EventLocationInput', () => ({
  __esModule: true,
  default: () => <div data-testid="event-location-input" />,
}));

jest.mock('@/components/forms/eventMutation/EventDateInput', () => ({
  __esModule: true,
  default: (props: unknown) => mockEventDateInput(props),
}));

jest.mock('@/components/admin/ConfirmDialog', () => ({
  __esModule: true,
  default: () => <div data-testid="confirm-dialog" />,
}));

const mockCategories: EventCategory[] = [
  { eventCategoryId: 'cat-1', name: 'Music', slug: 'music', description: 'Music events', iconName: 'music_note' },
];

const emptyEventData = {
  title: '',
  summary: '',
  description: '',
  eventCategories: [] as string[],
  status: 'Upcoming',
  lifecycleStatus: 'Draft',
  visibility: 'Public',
  privacySetting: 'Public',
  capacity: 100,
  rsvpLimit: undefined,
  waitlistEnabled: false,
  allowGuestPlusOnes: false,
  remindersEnabled: true,
  showAttendees: true,
  media: {},
  tags: {},
  location: { locationType: 'venue' },
  organizers: [{ user: 'user-123', role: EventOrganizerRole.Host }],
  additionalDetails: {},
  comments: {},
  eventLink: '',
  orgId: undefined,
  venueId: undefined,
  locationSnapshot: undefined,
  primarySchedule: {
    anchorStartAt: undefined as unknown as Date,
    occurrenceDurationMinutes: 0,
    timezone: 'Africa/Johannesburg',
    recurrenceRule: '',
  },
};

const validEventData = {
  ...emptyEventData,
  title: 'Test Event Title',
  summary: 'A short event summary',
  description: 'A detailed description of the test event',
  primarySchedule: {
    anchorStartAt: new Date('2026-06-01T10:00:00Z'),
    occurrenceDurationMinutes: 120,
    timezone: 'UTC',
    recurrenceRule: 'DTSTART:20260601T100000Z\nRRULE:FREQ=WEEKLY',
  },
  eventCategories: ['cat-1'],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockEventProp: any = {
  eventId: 'event-abc',
  slug: 'existing-event',
  title: 'Existing Event',
  summary: 'Existing summary',
  description: 'Existing description',
  primarySchedule: {
    anchorStartAt: new Date('2026-06-01T10:00:00Z'),
    occurrenceDurationMinutes: 120,
    timezone: 'UTC',
    recurrenceRule: 'DTSTART:20260601T100000Z',
  },
  status: 'Upcoming',
  lifecycleStatus: 'Published',
  visibility: 'Public',
  privacySetting: 'Public',
  capacity: 50,
  eventCategories: [{ eventCategoryId: 'cat-1' }],
  organizers: [
    {
      role: EventOrganizerRole.Host,
      user: {
        userId: 'user-123',
        username: 'testuser',
        given_name: 'Test',
        family_name: 'User',
        profile_picture: null,
      },
    },
  ],
  tags: {},
  media: {},
  eventLink: '',
  location: { locationType: 'venue' },
};

function setupMutationMocks() {
  (useLazyQuery as jest.Mock).mockReturnValue([mockLoadUsers, { data: { readUsers: [] }, loading: false }]);
  (useMutation as jest.Mock).mockImplementation((doc: unknown) => {
    if (doc === 'CreateEventDocument') {
      return [mockCreateEvent, { loading: false }];
    }
    return [mockUpdateEvent, { loading: false }];
  });
}

async function submitForm(container: HTMLElement) {
  // Directly submit the <form> element — the most reliable approach in jsdom
  await act(async () => {
    fireEvent.submit(container.querySelector('form')!);
    await Promise.resolve();
  });
}

describe('EventMutationForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateEvent.mockResolvedValue({ data: {} });
    mockUpdateEvent.mockResolvedValue({ data: {} });
    setupMutationMocks();

    // Default: empty form data (validation will fail)
    (usePersistentState as jest.Mock).mockReturnValue({
      value: emptyEventData,
      setValue: jest.fn(),
      clearStorage: mockClearStorage,
      isHydrated: true,
    });
  });

  describe('form validation', () => {
    it('shows required-field errors when submitting an empty form', async () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} />);
      await submitForm(container);

      expect(screen.getByText('Title is required')).toBeTruthy();
      expect(screen.getByText('Summary is required')).toBeTruthy();
      expect(screen.getByText('Description is required')).toBeTruthy();
    });

    it('shows recurrenceRule and categories errors when those fields are empty', async () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} />);
      await submitForm(container);

      expect(screen.getByText('Event date is required')).toBeTruthy();
      expect(screen.getByText('Select at least one category')).toBeTruthy();
    });

    it('does not call createEvent when validation fails', async () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} />);
      await submitForm(container);

      expect(mockCreateEvent).not.toHaveBeenCalled();
    });

    it('shows a summary error banner when any field is invalid', async () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} />);
      await submitForm(container);

      expect(screen.getByText('Please fix the errors below before submitting')).toBeTruthy();
    });
  });

  describe('create mode (no event prop)', () => {
    beforeEach(() => {
      (usePersistentState as jest.Mock).mockReturnValue({
        value: validEventData,
        setValue: jest.fn(),
        clearStorage: mockClearStorage,
        isHydrated: true,
      });
    });

    it('renders "Create Event" as the submit button label', () => {
      render(<EventMutationForm categoryList={mockCategories} />);
      expect(screen.getByRole('button', { name: /create event/i })).toBeTruthy();
    });

    it('enables persisted recurrence restore in create mode', () => {
      render(<EventMutationForm categoryList={mockCategories} />);

      expect(mockEventDateInput.mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({
          restorePersistedState: true,
        }),
      );
    });

    it('calls createEvent with the full event data on valid submit', async () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} />);
      await submitForm(container);

      expect(mockCreateEvent).toHaveBeenCalledWith({
        variables: { input: validEventData },
      });
    });

    it('does not call updateEvent in create mode', async () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} />);
      await submitForm(container);

      expect(mockUpdateEvent).not.toHaveBeenCalled();
    });

    it('clears storage and navigates to the event page on success', async () => {
      mockCreateEvent.mockResolvedValueOnce({ data: { createEvent: { slug: 'new-event-slug' } } });
      const { container } = render(<EventMutationForm categoryList={mockCategories} />);
      await submitForm(container);

      expect(mockClearStorage).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/events/new-event-slug');
    });

    it('shows a success snackbar message on success', async () => {
      mockCreateEvent.mockResolvedValueOnce({ data: { createEvent: { slug: 'new-event-slug' } } });
      const { container } = render(<EventMutationForm categoryList={mockCategories} />);
      await submitForm(container);

      await waitFor(() => expect(screen.getByText('Event created successfully!')).toBeTruthy());
    });

    it('shows an error alert when createEvent fails', async () => {
      mockCreateEvent.mockRejectedValueOnce(new Error('Server error occurred'));
      const { container } = render(<EventMutationForm categoryList={mockCategories} />);
      await submitForm(container);

      await waitFor(() => expect(screen.getByText('Server error occurred')).toBeTruthy());
    });

    it('shows an error alert when createEvent returns no slug', async () => {
      mockCreateEvent.mockResolvedValueOnce({ data: { createEvent: { slug: null } } });
      const { container } = render(<EventMutationForm categoryList={mockCategories} />);
      await submitForm(container);

      await waitFor(() =>
        expect(screen.getByText('Event created, but the server did not return a destination event.')).toBeTruthy(),
      );
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('does not navigate on error', async () => {
      mockCreateEvent.mockRejectedValueOnce(new Error('Server error occurred'));
      const { container } = render(<EventMutationForm categoryList={mockCategories} />);
      await submitForm(container);

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('edit mode (event prop provided)', () => {
    beforeEach(() => {
      (usePersistentState as jest.Mock).mockReturnValue({
        value: validEventData,
        setValue: jest.fn(),
        clearStorage: mockClearStorage,
        isHydrated: true,
      });
    });

    it('renders "Save Changes" as the submit button label', () => {
      render(<EventMutationForm categoryList={mockCategories} event={mockEventProp} />);
      expect(screen.getByRole('button', { name: /save changes/i })).toBeTruthy();
    });

    it('passes the existing schedule into the date input in edit mode', () => {
      (usePersistentState as jest.Mock).mockReturnValue({
        value: emptyEventData,
        setValue: jest.fn(),
        clearStorage: mockClearStorage,
        isHydrated: false,
      });

      render(<EventMutationForm categoryList={mockCategories} event={mockEventProp} />);

      expect(mockEventDateInput.mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({
          restorePersistedState: false,
          value: mockEventProp.primarySchedule,
        }),
      );
    });

    it('calls updateEvent (not createEvent) in edit mode', async () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} event={mockEventProp} />);
      await submitForm(container);

      expect(mockUpdateEvent).toHaveBeenCalled();
      expect(mockCreateEvent).not.toHaveBeenCalled();
    });

    it('includes the eventId in the updateEvent variables', async () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} event={mockEventProp} />);
      await submitForm(container);

      const callArgs = mockUpdateEvent.mock.calls[0][0];
      expect(callArgs.variables.input.eventId).toBe('event-abc');
    });

    it('clears storage and navigates to the event page on success', async () => {
      mockUpdateEvent.mockResolvedValueOnce({ data: { updateEvent: { slug: 'existing-event' } } });
      const { container } = render(<EventMutationForm categoryList={mockCategories} event={mockEventProp} />);
      await submitForm(container);

      expect(mockClearStorage).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/events/existing-event');
    });

    it('shows a success snackbar message on success', async () => {
      mockUpdateEvent.mockResolvedValueOnce({ data: { updateEvent: { slug: 'existing-event' } } });
      const { container } = render(<EventMutationForm categoryList={mockCategories} event={mockEventProp} />);
      await submitForm(container);

      await waitFor(() => expect(screen.getByText('Event updated successfully!')).toBeTruthy());
    });

    it('shows an error alert when updateEvent fails', async () => {
      mockUpdateEvent.mockRejectedValueOnce(new Error('Update failed'));
      const { container } = render(<EventMutationForm categoryList={mockCategories} event={mockEventProp} />);
      await submitForm(container);

      await waitFor(() => expect(screen.getByText('Update failed')).toBeTruthy());
    });

    it('shows an error alert when updateEvent returns no slug', async () => {
      mockUpdateEvent.mockResolvedValueOnce({ data: { updateEvent: { slug: null } } });
      const { container } = render(<EventMutationForm categoryList={mockCategories} event={mockEventProp} />);
      await submitForm(container);

      await waitFor(() =>
        expect(screen.getByText('Event updated, but the server did not return a destination event.')).toBeTruthy(),
      );
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('does not navigate on error', async () => {
      mockUpdateEvent.mockRejectedValueOnce(new Error('Update failed'));
      const { container } = render(<EventMutationForm categoryList={mockCategories} event={mockEventProp} />);
      await submitForm(container);

      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
