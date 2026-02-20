import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { OrganizationMembership as OrganizationMembershipEntity } from '@gatherle/commons/types';

@pre<OrganizationMembershipModel>('validate', function (next) {
  try {
    if (!this.membershipId && this._id) {
      this.membershipId = this._id.toString();
    }
    next();
  } catch (error) {
    next(error as Error);
  }
})
class OrganizationMembershipModel extends OrganizationMembershipEntity {}

const OrganizationMembership = getModelForClass(OrganizationMembershipModel, {
  options: { customName: 'OrganizationMembership' },
});

export default OrganizationMembership;
