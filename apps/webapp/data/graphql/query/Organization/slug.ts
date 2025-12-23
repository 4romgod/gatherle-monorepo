import { gql } from '@apollo/client';

export const GET_ORGANIZATION_BY_SLUG = gql`
  query GetOrganizationBySlug($slug: String!) {
    readOrganizationBySlug(slug: $slug) {
      orgId
      slug
      name
      description
      logo
      followersCount
      isFollowable
      tags
      domainsAllowed
      links {
        label
        url
      }
      eventDefaults {
        visibility
        remindersEnabled
        waitlistEnabled
        allowGuestPlusOnes
        ticketAccess
      }
    }
  }
`;
