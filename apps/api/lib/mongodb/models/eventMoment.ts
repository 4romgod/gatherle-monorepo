import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { EventMoment as EventMomentEntity } from '@gatherle/commons/types';
import type { MongoModelForClass } from './modelTypes';

@pre<EventMomentModel>('validate', function () {
  if (!this.momentId && this._id) {
    this.momentId = this._id.toString();
  }
})
class EventMomentModel extends EventMomentEntity {}

const EventMoment: MongoModelForClass<typeof EventMomentModel> = getModelForClass(EventMomentModel, {
  options: {
    customName: 'EventMoment',
  },
});

export default EventMoment;
