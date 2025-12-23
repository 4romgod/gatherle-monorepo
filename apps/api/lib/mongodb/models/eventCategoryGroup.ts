import 'reflect-metadata';
import {getModelForClass, pre} from '@typegoose/typegoose';
import {kebabCase} from 'lodash';
import {EventCategoryGroup as EventCategoryGroupEntity} from '@ntlango/commons/types';

@pre<EventCategoryGroupModel>('validate', function (next) {
  try {
    if (!this.eventCategoryGroupId && this._id) {
      this.eventCategoryGroupId = this._id.toString();
    }
    if (this.isModified('name')) {
      this.slug = kebabCase(this.name);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
})
class EventCategoryGroupModel extends EventCategoryGroupEntity {}

const EventCategoryGroup = getModelForClass(EventCategoryGroupModel, {
  options: {customName: 'EventCategoryGroup'},
});

export default EventCategoryGroup;
