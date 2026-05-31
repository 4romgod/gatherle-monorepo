import { graphql } from '@/data/graphql/types';

export const GetOrganizationsDocument = graphql(`
  query GetOrganizations($options: QueryOptionsInput) {
    readOrganizations(options: $options) {
      orgId
      ownerId
      slug
      name
      description
      logo
      billingEmail
      defaultVisibility
      followersCount
      isFollowable
      tags
      domainsAllowed
      memberRoles {
        membershipId
        orgId
        userId
        username
        role
        joinedAt
      }
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

export const GetOrganizationBySlugDocument = graphql(`
  query GetOrganizationBySlug($slug: String!) {
    readOrganizationBySlug(slug: $slug) {
      orgId
      slug
      name
      description
      logo
      billingEmail
      followersCount
      isFollowable
      tags
      domainsAllowed
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
