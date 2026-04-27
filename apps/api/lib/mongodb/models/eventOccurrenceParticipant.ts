import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { EventOccurrenceParticipant as EventOccurrenceParticipantEntity } from '@gatherle/commons/types';

@pre<EventOccurrenceParticipantModel>('validate', function (next) {
  try {
    if (!this.participantId && this._id) {
      this.participantId = this._id.toString();
    }
    next();
  } catch (error) {
    next(error as Error);
  }
})
class EventOccurrenceParticipantModel extends EventOccurrenceParticipantEntity {}

const EventOccurrenceParticipant = getModelForClass(EventOccurrenceParticipantModel, {
  options: { customName: 'EventOccurrenceParticipant' },
});

export default EventOccurrenceParticipant;
