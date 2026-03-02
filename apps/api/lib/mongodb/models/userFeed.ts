import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { UserFeedItem as UserFeedItemEntity } from '@gatherle/commons/types';

@pre<UserFeedItemModel>('validate', function (next) {
  try {
    if (!this.feedItemId && this._id) {
      this.feedItemId = this._id.toString();
    }
    next();
  } catch (error) {
    next(error as Error);
  }
})
class UserFeedItemModel extends UserFeedItemEntity {}

const UserFeed = getModelForClass(UserFeedItemModel, {
  options: { customName: 'UserFeed' },
});

export default UserFeed;
