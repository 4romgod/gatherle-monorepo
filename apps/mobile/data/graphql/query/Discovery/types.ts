import type {
  MobileEventsFeedQuery,
  MobileEventsFeedQueryVariables,
  MobileHomeDiscoveryQuery,
  MobileHomeDiscoveryQueryVariables,
} from '../../types/graphql';

export type MobileEventOccurrence = MobileEventsFeedQuery['readEventOccurrences'][number];
export type MobileParticipant = NonNullable<MobileEventOccurrence['participants']>[number];
export type MobileUserPreview = NonNullable<MobileParticipant['user']>;
export type MobileEventSeries = NonNullable<MobileEventOccurrence['eventSeries']>;
export type MobileEventCategory = MobileHomeDiscoveryQuery['readEventCategories'][number];
export type MobileOrganization = MobileHomeDiscoveryQuery['readOrganizations'][number];

export type MobileHomeDiscoveryResult = MobileHomeDiscoveryQuery;
export type MobileHomeDiscoveryVars = MobileHomeDiscoveryQueryVariables;

export type MobileEventsFeedResult = MobileEventsFeedQuery;
export type MobileEventsFeedVars = MobileEventsFeedQueryVariables;
