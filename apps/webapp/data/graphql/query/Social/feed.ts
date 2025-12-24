import {gql} from '@apollo/client';

export const GET_SOCIAL_FEED = gql`
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
`;
