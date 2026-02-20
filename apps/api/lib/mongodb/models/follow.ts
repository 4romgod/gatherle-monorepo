import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { Follow as FollowEntity } from '@gatherle/commons/types';

@pre<FollowModel>('validate', function (next) {
  try {
    if (!this.followId && this._id) {
      this.followId = this._id.toString();
    }
    next();
  } catch (error) {
    next(error as Error);
  }
})
class FollowModel extends FollowEntity {}

const Follow = getModelForClass(FollowModel, {
  options: { customName: 'Follow' },
});

export default Follow;
