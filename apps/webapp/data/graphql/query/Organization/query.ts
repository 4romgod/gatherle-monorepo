import { graphql } from '@/data/graphql/types';

export const GetAllOrganizationsDocument = graphql(`
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
`);

export const GetOrganizationBySlugDocument = graphql(`
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
      allowedTicketAccess
      ownerId
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
`);

export const GetPopularOrganizationsDocument = graphql(`
  query GetPopularOrganizations {
    readOrganizations {
      orgId
      ownerId
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
`);
