type EventTimeValue = Date | string | null | undefined;

type EventQuerySortOrder = string;

export type CollectionQueryPaginationOptions = {
  enabled?: boolean;
  limit?: number;
  skip?: number;
};

type HostedEventsQueryOptions<TOrder extends EventQuerySortOrder> = {
  filters: Array<{
    field: string;
    value: string;
  }>;
  pagination: {
    limit: number;
    skip: number;
  };
  search?: {
    fields: string[];
    value: string;
  };
  sort: Array<{
    field: string;
    order: TOrder;
  }>;
};

type PartitionedEventItems<T> = {
  past: T[];
  upcoming: T[];
};

export function buildCollectionPagination(limit?: number, skip = 0) {
  if (typeof limit !== 'number') {
    return undefined;
  }

  return {
    pagination: {
      limit,
      skip,
    },
  };
}

function resolveTimestamp(value: EventTimeValue, fallback: number) {
  if (!value) {
    return fallback;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? fallback : timestamp;
}

export function buildHostedEventsQueryOptions<TOrder extends EventQuerySortOrder>(
  userId: string,
  order: TOrder,
  limit: number,
  skip = 0,
  searchTerm = '',
): HostedEventsQueryOptions<TOrder> {
  const trimmedQuery = searchTerm.trim();

  return {
    filters: [{ field: 'organizers.user.userId', value: userId }],
    pagination: { limit, skip },
    sort: [{ field: 'createdAt', order }],
    ...(trimmedQuery.length >= 2
      ? {
          search: {
            fields: [
              'title',
              'slug',
              'summary',
              'description',
              'organization.name',
              'eventCategories.name',
              'location.address.city',
              'location.address.state',
              'location.address.country',
            ],
            value: trimmedQuery,
          },
        }
      : {}),
  };
}

export function buildHostedEventsCountQueryOptions(userId: string, searchTerm = '') {
  const trimmedQuery = searchTerm.trim();

  return {
    filters: [{ field: 'organizers.user.userId', value: userId }],
    ...(trimmedQuery.length >= 2
      ? {
          search: {
            fields: [
              'title',
              'slug',
              'summary',
              'description',
              'organization.name',
              'eventCategories.name',
              'location.address.city',
              'location.address.state',
              'location.address.country',
            ],
            value: trimmedQuery,
          },
        }
      : {}),
  };
}

export function isUpcomingEventTime(startAt: EventTimeValue, endAt?: EventTimeValue, fromDate: Date = new Date()) {
  const comparisonTimestamp = resolveTimestamp(endAt ?? startAt, Number.NEGATIVE_INFINITY);
  return comparisonTimestamp >= fromDate.getTime();
}

export function sortItemsByEventTime<T>(
  items: readonly T[],
  getStartAt: (item: T) => EventTimeValue,
  direction: 'asc' | 'desc' = 'asc',
) {
  const fallback = direction === 'asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;

  return [...items].sort((left, right) => {
    const leftTimestamp = resolveTimestamp(getStartAt(left), fallback);
    const rightTimestamp = resolveTimestamp(getStartAt(right), fallback);

    if (leftTimestamp === rightTimestamp) {
      return 0;
    }

    return direction === 'asc' ? leftTimestamp - rightTimestamp : rightTimestamp - leftTimestamp;
  });
}

export function splitItemsByEventTime<T>(
  items: readonly T[],
  getStartAt: (item: T) => EventTimeValue,
  getEndAt?: (item: T) => EventTimeValue,
  fromDate: Date = new Date(),
): PartitionedEventItems<T> {
  const upcoming: T[] = [];
  const past: T[] = [];

  items.forEach((item) => {
    if (isUpcomingEventTime(getStartAt(item), getEndAt?.(item), fromDate)) {
      upcoming.push(item);
      return;
    }

    past.push(item);
  });

  return {
    past: sortItemsByEventTime(past, getStartAt, 'desc'),
    upcoming: sortItemsByEventTime(upcoming, getStartAt, 'asc'),
  };
}
