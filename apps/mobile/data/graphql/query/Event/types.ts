import type { GetEventsQuery } from '../../types/graphql';

export type MobileEventSeriesListItem = GetEventsQuery['readEvents'][number];
