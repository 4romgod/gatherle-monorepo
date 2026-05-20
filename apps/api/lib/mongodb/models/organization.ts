import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { kebabCase } from 'lodash';
import { Organization as OrganizationEntity } from '@gatherle/commons/types';
import type { MongoModelForClass } from './modelTypes';

@pre<OrganizationModel>('validate', function () {
  if (!this.orgId && this._id) {
    this.orgId = this._id.toString();
  }
  if (this.isNew || !this.slug) {
    this.slug = kebabCase(this.name);
  }
})
class OrganizationModel extends OrganizationEntity {}

const Organization: MongoModelForClass<typeof OrganizationModel> = getModelForClass(OrganizationModel, {
  options: { customName: 'Organization' },
});

export default Organization;
