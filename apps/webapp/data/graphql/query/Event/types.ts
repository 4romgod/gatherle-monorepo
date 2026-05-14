import { GetEventOccurrencesQuery, GetEventsQuery, GetEventBySlugQuery } from '@/data/graphql/types/graphql';

export type EventPreview = NonNullable<GetEventsQuery['readEvents']>[number];
export type EventSeriesParticipantPreview = NonNullable<EventPreview['participants']>[number];
export type EventOccurrencePreview = NonNullable<GetEventOccurrencesQuery['readEventOccurrences']>[number];
export type EventOccurrenceParticipantPreview = NonNullable<EventOccurrencePreview['participants']>[number];
export type EventDetail = NonNullable<GetEventBySlugQuery['readEventBySlug']>;
export type EventDetailOccurrence = NonNullable<EventDetail['upcomingOccurrences']>[number];
export type EventDetailOccurrenceParticipant = NonNullable<EventDetailOccurrence['participants']>[number];
