import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { SupportRequest as SupportRequestEntity } from '@gatherle/commons/server/types';
import type { MongoModelForClass } from './modelTypes';

@pre<SupportRequestModel>('validate', function () {
  if (!this.supportRequestId && this._id) {
    this.supportRequestId = this._id.toString();
  }
})
class SupportRequestModel extends SupportRequestEntity {}

const SupportRequest: MongoModelForClass<typeof SupportRequestModel> = getModelForClass(SupportRequestModel, {
  options: { customName: 'SupportRequest' },
});

export default SupportRequest;
