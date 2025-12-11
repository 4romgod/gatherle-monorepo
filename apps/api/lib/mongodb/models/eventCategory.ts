import {getModelForClass, pre} from '@typegoose/typegoose';
import {kebabCase} from 'lodash';
import {EventCategoryType} from '@ntlango/commons/types';

@pre<EventCategoryModel>('validate', function (next) {
  try {
    if (!this.eventCategoryId && this._id) {
      this.eventCategoryId = this._id.toString();
    }
    if (this.isModified('name')) {
      this.slug = kebabCase(this.name);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
})
class EventCategoryModel extends EventCategoryType {}

const EventCategory = getModelForClass(EventCategoryModel, {
  options: {customName: 'EventCategoryType'},
});

export default EventCategory;
