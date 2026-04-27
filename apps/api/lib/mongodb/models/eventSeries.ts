import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { kebabCase } from 'lodash';
import { EventSeries as EventEntity } from '@gatherle/commons/types';

@pre<EventSeriesModel>('validate', function (next) {
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
class EventSeriesModel extends EventEntity {}

const EventSeries = getModelForClass(EventSeriesModel, {
  options: { customName: 'EventSeries' },
});

export default EventSeries;
