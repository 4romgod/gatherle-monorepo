import { gql } from '@apollo/client';

export const GET_ORGANIZATIONS = gql`
  query GetOrganizations {
    readOrganizations {
      orgId
      slug
      name
      description
      logo
      defaultVisibility
      allowedTicketAccess
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
