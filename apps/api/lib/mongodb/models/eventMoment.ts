import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { EventMoment as EventMomentEntity } from '@gatherle/commons/types';

@pre<EventMomentModel>('validate', function (next) {
  try {
    if (!this.momentId && this._id) {
      this.momentId = this._id.toString();
    }
    next();
  } catch (error) {
    next(error as Error);
  }
})
class EventMomentModel extends EventMomentEntity {}

const EventMoment = getModelForClass(EventMomentModel, {
  options: {
    customName: 'EventMoment',
  },
});

export default EventMoment;
