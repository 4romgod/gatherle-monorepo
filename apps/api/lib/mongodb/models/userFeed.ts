import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { UserFeedItem as UserFeedItemEntity } from '@gatherle/commons/server/types';
import type { MongoModelForClass } from './modelTypes';

@pre<UserFeedItemModel>('validate', function () {
  if (!this.feedItemId && this._id) {
    this.feedItemId = this._id.toString();
  }
})
class UserFeedItemModel extends UserFeedItemEntity {}

const UserFeed: MongoModelForClass<typeof UserFeedItemModel> = getModelForClass(UserFeedItemModel, {
  options: { customName: 'UserFeed' },
});

export default UserFeed;
