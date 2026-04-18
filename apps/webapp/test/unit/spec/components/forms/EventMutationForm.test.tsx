import { render, screen, fireEvent, act } from '@testing-library/react';
import { useMutation } from '@apollo/client';
import { usePersistentState } from '@/hooks';
import EventMutationForm from '@/components/forms/eventMutation';
import type { EventCategory } from '@/data/graphql/types/graphql';

const mockPush = jest.fn();
const mockClearStorage = jest.fn();
const mockCreateEvent = jest.fn();
const mockUpdateEvent = jest.fn();

type MutationOptions = {
  onCompleted?: (data: unknown) => void;
  onError?: (err: { message: string }) => void;
};
let capturedCreateOptions: MutationOptions = {};
let capturedUpdateOptions: MutationOptions = {};

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
  useMutation: jest.fn(),
}));

jest.mock('@/hooks/useImageUpload', () => ({
  useImageUpload: jest.fn(() => ({
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
  default: () => <div data-testid="event-date-input" />,
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
  organizers: [] as string[],
  additionalDetails: {},
  comments: {},
  eventLink: '',
  orgId: undefined,
  venueId: undefined,
  locationSnapshot: undefined,
  primarySchedule: {
    startAt: undefined as unknown as Date,
    endAt: undefined,
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
    startAt: new Date('2026-06-01T10:00:00Z'),
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
    startAt: new Date('2026-06-01T10:00:00Z'),
    timezone: 'UTC',
    recurrenceRule: 'DTSTART:20260601T100000Z',
  },
  status: 'Upcoming',
  lifecycleStatus: 'Published',
  visibility: 'Public',
  privacySetting: 'Public',
  capacity: 50,
  eventCategories: [{ eventCategoryId: 'cat-1' }],
  organizers: [],
  tags: {},
  media: {},
  eventLink: '',
  location: { locationType: 'venue' },
};

function setupMutationMocks() {
  (useMutation as jest.Mock).mockImplementation((doc: unknown, options: MutationOptions) => {
    if (doc === 'CreateEventDocument') {
      capturedCreateOptions = options;
      return [mockCreateEvent, { loading: false }];
    }
    capturedUpdateOptions = options;
    return [mockUpdateEvent, { loading: false }];
  });
}

function submitForm(container: HTMLElement) {
  // Directly submit the <form> element — the most reliable approach in jsdom
  fireEvent.submit(container.querySelector('form')!);
}

describe('EventMutationForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedCreateOptions = {};
    capturedUpdateOptions = {};
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
    it('shows required-field errors when submitting an empty form', () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} />);
      submitForm(container);

      expect(screen.getByText('Title is required')).toBeTruthy();
      expect(screen.getByText('Summary is required')).toBeTruthy();
      expect(screen.getByText('Description is required')).toBeTruthy();
    });

    it('shows recurrenceRule and categories errors when those fields are empty', () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} />);
      submitForm(container);

      expect(screen.getByText('Event date is required')).toBeTruthy();
      expect(screen.getByText('Select at least one category')).toBeTruthy();
    });

    it('does not call createEvent when validation fails', () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} />);
      submitForm(container);

      expect(mockCreateEvent).not.toHaveBeenCalled();
    });

    it('shows a summary error banner when any field is invalid', () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} />);
      submitForm(container);

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

    it('calls createEvent with the full event data on valid submit', () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} />);
      submitForm(container);

      expect(mockCreateEvent).toHaveBeenCalledWith({
        variables: { input: validEventData },
      });
    });

    it('does not call updateEvent in create mode', () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} />);
      submitForm(container);

      expect(mockUpdateEvent).not.toHaveBeenCalled();
    });

    it('clears storage and navigates to the event page on success', () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} />);
      submitForm(container);

      act(() => {
        capturedCreateOptions.onCompleted?.({ createEvent: { slug: 'new-event-slug' } });
      });

      expect(mockClearStorage).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/events/new-event-slug');
    });

    it('shows a success snackbar message on success', () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} />);
      submitForm(container);

      act(() => {
        capturedCreateOptions.onCompleted?.({ createEvent: { slug: 'new-event-slug' } });
      });

      expect(screen.getByText('Event created successfully!')).toBeTruthy();
    });

    it('shows an error alert when createEvent fails', () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} />);
      submitForm(container);

      act(() => {
        capturedCreateOptions.onError?.({ message: 'Server error occurred' });
      });

      expect(screen.getByText('Server error occurred')).toBeTruthy();
    });

    it('does not navigate on error', () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} />);
      submitForm(container);

      act(() => {
        capturedCreateOptions.onError?.({ message: 'Server error occurred' });
      });

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

    it('calls updateEvent (not createEvent) in edit mode', () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} event={mockEventProp} />);
      submitForm(container);

      expect(mockUpdateEvent).toHaveBeenCalled();
      expect(mockCreateEvent).not.toHaveBeenCalled();
    });

    it('includes the eventId in the updateEvent variables', () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} event={mockEventProp} />);
      submitForm(container);

      const callArgs = mockUpdateEvent.mock.calls[0][0];
      expect(callArgs.variables.input.eventId).toBe('event-abc');
    });

    it('clears storage and navigates to the event page on success', () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} event={mockEventProp} />);
      submitForm(container);

      act(() => {
        capturedUpdateOptions.onCompleted?.({ updateEvent: { slug: 'existing-event' } });
      });

      expect(mockClearStorage).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/events/existing-event');
    });

    it('shows a success snackbar message on success', () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} event={mockEventProp} />);
      submitForm(container);

      act(() => {
        capturedUpdateOptions.onCompleted?.({ updateEvent: { slug: 'existing-event' } });
      });

      expect(screen.getByText('Event updated successfully!')).toBeTruthy();
    });

    it('shows an error alert when updateEvent fails', () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} event={mockEventProp} />);
      submitForm(container);

      act(() => {
        capturedUpdateOptions.onError?.({ message: 'Update failed' });
      });

      expect(screen.getByText('Update failed')).toBeTruthy();
    });

    it('does not navigate on error', () => {
      const { container } = render(<EventMutationForm categoryList={mockCategories} event={mockEventProp} />);
      submitForm(container);

      act(() => {
        capturedUpdateOptions.onError?.({ message: 'Update failed' });
      });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
