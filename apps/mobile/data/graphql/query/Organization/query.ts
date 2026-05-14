import { graphql } from '../../types';

export const GetOrganizationsDocument = graphql(`
  query GetOrganizations {
    readOrganizations {
      orgId
      ownerId
      slug
      name
      description
      logo
      defaultVisibility
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
      }
    }
  }
`);

export const GetMyOrganizationsDocument = graphql(`
  query GetMyOrganizations {
    readMyOrganizations {
      organization {
        orgId
        ownerId
        slug
        name
        description
        logo
        tags
        followersCount
        isFollowable
      }
      role
    }
  }
`);
