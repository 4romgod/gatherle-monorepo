import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { Follow as FollowEntity } from '@gatherle/commons/types';
import type { MongoModelForClass } from './modelTypes';

@pre<FollowModel>('validate', function () {
  if (!this.followId && this._id) {
    this.followId = this._id.toString();
  }
})
class FollowModel extends FollowEntity {}

const Follow: MongoModelForClass<typeof FollowModel> = getModelForClass(FollowModel, {
  options: { customName: 'Follow' },
});

export default Follow;
