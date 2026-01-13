import 'reflect-metadata';
import {getModelForClass, pre} from '@typegoose/typegoose';
import {kebabCase} from 'lodash';
import {Organization as OrganizationEntity} from '@ntlango/commons/types';

@pre<OrganizationModel>('validate', function (next) {
  try {
    if (!this.orgId && this._id) {
      this.orgId = this._id.toString();
    }
    if (this.isNew || !this.slug) {
      this.slug = kebabCase(this.name);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
})
class OrganizationModel extends OrganizationEntity {}

const Organization = getModelForClass(OrganizationModel, {
  options: {customName: 'Organization'},
});

export default Organization;
