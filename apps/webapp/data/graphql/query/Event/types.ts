import { GetAllEventsQuery, GetEventBySlugQuery } from '@/data/graphql/types/graphql';

export type EventPreview = NonNullable<GetAllEventsQuery['readEvents']>[number];
export type EventSeriesParticipantPreview = NonNullable<EventPreview['participants']>[number];
export type EventDetail = NonNullable<GetEventBySlugQuery['readEventBySlug']>;
