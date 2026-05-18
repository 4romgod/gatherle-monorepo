import { graphql } from '../../types';

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
      isFollowable
      followPolicy
      tags
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
      isFollowable
      followPolicy
      tags
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
