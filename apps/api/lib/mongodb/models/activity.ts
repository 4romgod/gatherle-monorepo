import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { Activity as ActivityEntity } from '@gatherle/commons/types';
import type { MongoModelForClass } from './modelTypes';

@pre<ActivityModel>('validate', function () {
  if (!this.activityId && this._id) {
    this.activityId = this._id.toString();
  }
})
class ActivityModel extends ActivityEntity {}

const Activity: MongoModelForClass<typeof ActivityModel> = getModelForClass(ActivityModel, {
  options: { customName: 'Activity' },
});

export default Activity;
