import {getModelForClass, pre} from '@typegoose/typegoose';
import {kebabCase} from 'lodash';
import {EventType} from '@ntlango/commons/types';

@pre<EventModel>('validate', function (next) {
  try {
    if (!this.eventId && this._id) {
      this.eventId = this._id.toString();
    }

    if (this.isModified('title')) {
      this.slug = kebabCase(this.title);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
})
class EventModel extends EventType {}

const Event = getModelForClass(EventModel, {
  options: {customName: 'EventType'},
});

export default Event;
