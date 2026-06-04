import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { OrganizationMembership as OrganizationMembershipEntity } from '@gatherle/commons/server/types';
import type { MongoModelForClass } from './modelTypes';

@pre<OrganizationMembershipModel>('validate', function () {
  if (!this.membershipId && this._id) {
    this.membershipId = this._id.toString();
  }
})
class OrganizationMembershipModel extends OrganizationMembershipEntity {}

const OrganizationMembership: MongoModelForClass<typeof OrganizationMembershipModel> = getModelForClass(
  OrganizationMembershipModel,
  {
    options: { customName: 'OrganizationMembership' },
  },
);

export default OrganizationMembership;
