import { graphql } from '@/data/graphql/types';

export const CreateOrganizationDocument = graphql(`
  mutation CreateOrganization($input: CreateOrganizationInput!) {
    createOrganization(input: $input) {
      orgId
      slug
      name
      description
      logo
      ownerId
      defaultVisibility
      billingEmail
      isFollowable
      followPolicy
      followersListVisibility
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

export const UpdateOrganizationDocument = graphql(`
  mutation UpdateOrganization($input: UpdateOrganizationInput!) {
    updateOrganization(input: $input) {
      orgId
      slug
      name
      description
      logo
      ownerId
      defaultVisibility
      billingEmail
      isFollowable
      followPolicy
      followersListVisibility
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

export const DeleteOrganizationDocument = graphql(`
  mutation DeleteOrganization($orgId: String!) {
    deleteOrganizationById(orgId: $orgId) {
      orgId
      name
    }
  }
`);
