import {getModelForClass, pre} from '@typegoose/typegoose';
import {kebabCase} from 'lodash';
import {EventCategoryGroupType} from '@ntlango/commons/types';

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
class EventCategoryGroupModel extends EventCategoryGroupType {}

const EventCategoryGroup = getModelForClass(EventCategoryGroupModel, {
  options: {customName: 'EventCategoryGroupType'},
});

export default EventCategoryGroup;
