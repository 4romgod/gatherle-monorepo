import type {
  GetEventsFeedQuery,
  GetEventsFeedQueryVariables,
  GetHomeDiscoveryQuery,
  GetHomeDiscoveryQueryVariables,
} from '../../types/graphql';

export type MobileEventOccurrence = GetEventsFeedQuery['readEventOccurrences'][number];
export type MobileParticipant = NonNullable<MobileEventOccurrence['participants']>[number];
export type MobileUserPreview = NonNullable<MobileParticipant['user']>;
export type MobileEventSeries = NonNullable<MobileEventOccurrence['eventSeries']>;
export type MobileEventCategory = GetHomeDiscoveryQuery['readEventCategories'][number];
export type MobileOrganization = GetHomeDiscoveryQuery['readOrganizations'][number];

export type MobileHomeDiscoveryResult = GetHomeDiscoveryQuery;
export type MobileHomeDiscoveryVars = GetHomeDiscoveryQueryVariables;

export type MobileEventsFeedResult = GetEventsFeedQuery;
export type MobileEventsFeedVars = GetEventsFeedQueryVariables;
