import {getModelForClass, pre} from '@typegoose/typegoose';
import {kebabCase} from 'lodash';
import {EventCategory as EventCategoryEntity} from '@ntlango/commons/types';

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
class EventCategoryModel extends EventCategoryEntity {}

const EventCategory = getModelForClass(EventCategoryModel, {
  options: {customName: 'EventCategory'},
});

export default EventCategory;
