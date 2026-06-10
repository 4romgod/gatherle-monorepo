import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { MobileDeviceAccess as MobileDeviceAccessEntity } from '@gatherle/commons/server/types';
import type { MongoModelForClass } from './modelTypes';

@pre<MobileDeviceAccessModel>('validate', function () {
  if (!this.mobileDeviceAccessId && this._id) {
    this.mobileDeviceAccessId = this._id.toString();
  }
})
class MobileDeviceAccessModel extends MobileDeviceAccessEntity {}

const MobileDeviceAccess: MongoModelForClass<typeof MobileDeviceAccessModel> = getModelForClass(
  MobileDeviceAccessModel,
  {
    options: { customName: 'MobileDeviceAccess' },
  },
);

export default MobileDeviceAccess;
