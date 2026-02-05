import 'reflect-metadata';
import { Field, ObjectType } from 'type-graphql';
import { OrganizationRole } from './organizationMembership';
import { Organization } from './organization';

@ObjectType('MyOrganization', { description: 'Organization paired with the current user’s role' })
export class MyOrganization {
  @Field(() => Organization, { description: 'Organization details' })
  organization: Organization;

  @Field(() => OrganizationRole, { description: 'Role that the current user holds in the organization' })
  role: OrganizationRole;
}
