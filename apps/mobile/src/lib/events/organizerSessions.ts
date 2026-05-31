import {
  EventOccurrenceStatus,
  ParticipantStatus,
  SortOrderInput,
  type GetEventOccurrencesQuery,
} from '@data/graphql/types/graphql';

export const ORGANIZER_OCCURRENCE_PAGE_SIZE = 12;
export const ORGANIZER_OCCURRENCE_LOOKBACK_DAYS = 30;
export const ORGANIZER_OCCURRENCE_LOOKAHEAD_DAYS = 180;

type OrganizerOccurrence = NonNullable<GetEventOccurrencesQuery['readEventOccurrences']>[number];
type OrganizerOccurrenceParticipant = NonNullable<OrganizerOccurrence['participants']>[number];

type TimeZoneDateParts = {
  day: number;
  hour: number;
  minute: number;
  second: number;
  month: number;
  year: number;
};

export function getOrganizerOccurrenceWindow() {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - ORGANIZER_OCCURRENCE_LOOKBACK_DAYS);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + ORGANIZER_OCCURRENCE_LOOKAHEAD_DAYS);
  endDate.setHours(23, 59, 59, 999);

  return { endDate, startDate };
}

export function buildOrganizerOccurrenceQueryOptions(
  eventId: string,
  dateRange: { startDate: Date; endDate: Date },
  limit: number,
  skip = 0,
) {
  return {
    dateRange,
    filters: [{ field: 'eventId', value: eventId }],
    pagination: { limit, skip },
    sort: [{ field: 'startAt', order: SortOrderInput.Asc }],
  };
}

export function buildOccurrenceParticipantBreakdown(
  participants: readonly OrganizerOccurrenceParticipant[] | null | undefined,
) {
  return (participants ?? []).reduce(
    (summary, participant) => {
      switch (participant.status) {
        case ParticipantStatus.CheckedIn:
          summary.checkedIn += participant.quantity ?? 1;
          summary.going += participant.quantity ?? 1;
          break;
        case ParticipantStatus.Going:
          summary.going += participant.quantity ?? 1;
          break;
        case ParticipantStatus.Interested:
          summary.interested += participant.quantity ?? 1;
          break;
        case ParticipantStatus.Waitlisted:
          summary.waitlisted += participant.quantity ?? 1;
          break;
        default:
          break;
      }

      return summary;
    },
    {
      checkedIn: 0,
      going: 0,
      interested: 0,
      waitlisted: 0,
    },
  );
}

export function getOrganizerOccurrenceTone(status: EventOccurrenceStatus) {
  switch (status) {
    case EventOccurrenceStatus.Cancelled:
      return 'error';
    case EventOccurrenceStatus.Completed:
      return 'default';
    case EventOccurrenceStatus.Scheduled:
    default:
      return 'primary';
  }
}

export function formatDateInputInTimeZone(value: string | Date | null | undefined, timeZone: string) {
  const parts = getTimeZoneDateParts(value, timeZone);
  if (!parts) {
    return '';
  }

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function formatTimeInputInTimeZone(value: string | Date | null | undefined, timeZone: string) {
  const parts = getTimeZoneDateParts(value, timeZone);
  if (!parts) {
    return '';
  }

  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function buildIsoFromTimeZoneDateAndTime(dateValue: string, timeValue: string, timeZone: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue.trim());
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue.trim());

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const initialOffset = getTimeZoneOffsetMs(utcGuess, timeZone);
  let resolvedDate = new Date(utcGuess.getTime() - initialOffset);
  const refinedOffset = getTimeZoneOffsetMs(resolvedDate, timeZone);

  if (refinedOffset !== initialOffset) {
    resolvedDate = new Date(utcGuess.getTime() - refinedOffset);
  }

  return Number.isNaN(resolvedDate.getTime()) ? null : resolvedDate.toISOString();
}

function getTimeZoneDateParts(value: string | Date | null | undefined, timeZone: string): TimeZoneDateParts | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone,
    year: 'numeric',
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    day: getPart('day'),
    hour: getPart('hour'),
    minute: getPart('minute'),
    second: getPart('second'),
    month: getPart('month'),
    year: getPart('year'),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getTimeZoneDateParts(date, timeZone);
  if (!parts) {
    return 0;
  }

  const zonedUtcTimestamp = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return zonedUtcTimestamp - date.getTime();
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}
