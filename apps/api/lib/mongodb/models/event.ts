import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { kebabCase } from 'lodash';
import { Event as EventEntity } from '@gatherle/commons/types';

@pre<EventModel>('validate', function (next) {
  try {
    if (!this.eventId && this._id) {
      this.eventId = this._id.toString();
    }

    if (this.isNew || !this.slug) {
      this.slug = kebabCase(this.title);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
})
class EventModel extends EventEntity {}

const Event = getModelForClass(EventModel, {
  options: { customName: 'Event' },
});

export default Event;
