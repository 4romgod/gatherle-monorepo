import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { EventSeriesParticipant as EventParticipantEntity } from '@gatherle/commons/types';

@pre<EventParticipantModel>('validate', function (next) {
  try {
    if (!this.participantId && this._id) {
      this.participantId = this._id.toString();
    }
    next();
  } catch (error) {
    next(error as Error);
  }
})
class EventParticipantModel extends EventParticipantEntity {}

const EventSeriesParticipant = getModelForClass(EventParticipantModel, {
  options: { customName: 'EventSeriesParticipant' },
});

export default EventSeriesParticipant;
