import { graphql } from '@/data/graphql/types';

export const GetSocialFeedDocument = graphql(`
  query GetSocialFeed($limit: Int) {
    readFeed(limit: $limit) {
      activityId
      actorId
      verb
      objectType
      objectId
      visibility
      eventAt
      metadata
    }
  }
`);
