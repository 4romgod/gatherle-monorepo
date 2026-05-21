import type { GetMyEventOccurrenceRsvpsQuery, GetMyEventOccurrenceRsvpsQueryVariables } from '../../types/graphql';

export type MobileRsvpParticipant = GetMyEventOccurrenceRsvpsQuery['myEventOccurrenceRsvps'][number];
export type MobileRsvpOccurrence = NonNullable<MobileRsvpParticipant['occurrence']>;

export type MobileMyRsvpsResult = GetMyEventOccurrenceRsvpsQuery;
export type MobileMyRsvpsVars = GetMyEventOccurrenceRsvpsQueryVariables;
