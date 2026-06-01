import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useOccurrenceCalendarEvents } from '@/hooks/events/useOccurrenceCalendarEvents';

const mockUseApolloClient = jest.fn();

jest.mock('@apollo/client', () => ({
  useApolloClient: () => mockUseApolloClient(),
}));

const baseFilters = {
  categories: [],
  statuses: [],
  dateOption: null,
  location: { city: '', state: '', country: '' },
};

const baseDateRange = {
  startDate: '2026-05-30T22:00:00.000Z',
  endDate: '2026-07-04T21:59:59.999Z',
};

describe('useOccurrenceCalendarEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not auto-refetch when rerendered with an equivalent date range object', async () => {
    const query = jest.fn().mockResolvedValue({
      data: {
        readEventCategories: [],
        readEventOccurrences: [],
        readEventOccurrencesCount: 0,
      },
    });
    mockUseApolloClient.mockReturnValue({ query });

    const { rerender } = renderHook(
      ({ dateRange }: { dateRange: { endDate: string; startDate: string } }) =>
        useOccurrenceCalendarEvents(baseFilters, 'token', dateRange),
      {
        initialProps: {
          dateRange: baseDateRange,
        },
      },
    );

    await waitFor(() => {
      expect(query).toHaveBeenCalledTimes(1);
    });

    rerender({
      dateRange: {
        startDate: baseDateRange.startDate,
        endDate: baseDateRange.endDate,
      },
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(query).toHaveBeenCalledTimes(1);
  });

  it('still refetches when requested manually', async () => {
    const query = jest.fn().mockResolvedValue({
      data: {
        readEventCategories: [],
        readEventOccurrences: [],
        readEventOccurrencesCount: 0,
      },
    });
    mockUseApolloClient.mockReturnValue({ query });

    const { result } = renderHook(() => useOccurrenceCalendarEvents(baseFilters, 'token', baseDateRange));

    await waitFor(() => {
      expect(query).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(query).toHaveBeenCalledTimes(2);
  });
});
