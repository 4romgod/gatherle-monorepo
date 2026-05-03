import { GetAllEventOccurrencesQuery, GetAllEventsQuery, GetEventBySlugQuery } from '@/data/graphql/types/graphql';

export type EventPreview = NonNullable<GetAllEventsQuery['readEvents']>[number];
export type EventSeriesParticipantPreview = NonNullable<EventPreview['participants']>[number];
export type EventOccurrencePreview = NonNullable<GetAllEventOccurrencesQuery['readEventOccurrences']>[number];
export type EventOccurrenceParticipantPreview = NonNullable<EventOccurrencePreview['participants']>[number];
export type EventDetail = NonNullable<GetEventBySlugQuery['readEventBySlug']>;
export type EventDetailOccurrence = NonNullable<EventDetail['upcomingOccurrences']>[number];
export type EventDetailOccurrenceParticipant = NonNullable<EventDetailOccurrence['participants']>[number];
