import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { kebabCase } from 'lodash';
import { EventSeries as EventEntity } from '@gatherle/commons/types';
import type { MongoModelForClass } from './modelTypes';

@pre<EventSeriesModel>('validate', function () {
  if (!this.eventId && this._id) {
    this.eventId = this._id.toString();
  }
  if (this.isNew || !this.slug) {
    this.slug = kebabCase(this.title);
  }
})
class EventSeriesModel extends EventEntity {}

const EventSeries: MongoModelForClass<typeof EventSeriesModel> = getModelForClass(EventSeriesModel, {
  options: { customName: 'EventSeries' },
});

export default EventSeries;
