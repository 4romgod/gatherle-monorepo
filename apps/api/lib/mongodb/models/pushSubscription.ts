import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { PushSubscription as PushSubscriptionEntity } from '@gatherle/commons/server/types';
import type { MongoModelForClass } from './modelTypes';

@pre<PushSubscriptionModel>('validate', function () {
  if (!this.pushSubscriptionId && this._id) {
    this.pushSubscriptionId = this._id.toString();
  }
})
class PushSubscriptionModel extends PushSubscriptionEntity {}

const PushSubscription: MongoModelForClass<typeof PushSubscriptionModel> = getModelForClass(PushSubscriptionModel, {
  options: { customName: 'PushSubscription' },
});

export default PushSubscription;
