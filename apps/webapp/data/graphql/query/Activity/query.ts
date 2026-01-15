import { graphql } from '@/data/graphql/types';

export const GetSocialFeedDocument = graphql(`
  query GetSocialFeed($limit: Int) {
    readFeed(limit: $limit) {
      activityId
      actorId
      actor {
        userId
        username
        given_name
        family_name
        profile_picture
      }
      verb
      objectType
      objectId
      objectUser {
        userId
        username
        given_name
        family_name
        profile_picture
      }
      objectEvent {
        eventId
        slug
        title
        media {
          featuredImageUrl
        }
      }
      objectOrganization {
        orgId
        slug
        name
        logo
      }
      visibility
      eventAt
      createdAt
      metadata
    }
  }
`);
