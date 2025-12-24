import 'reflect-metadata';
import {getModelForClass, pre} from '@typegoose/typegoose';
import {Activity as ActivityEntity} from '@ntlango/commons/types';

@pre<ActivityModel>('validate', function (next) {
  try {
    if (!this.activityId && this._id) {
      this.activityId = this._id.toString();
    }
    next();
  } catch (error) {
    next(error as Error);
  }
})
class ActivityModel extends ActivityEntity {}

const Activity = getModelForClass(ActivityModel, {
  options: {customName: 'Activity'},
});

export default Activity;
