import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { EventOccurrenceParticipant as EventOccurrenceParticipantEntity } from '@gatherle/commons/server/types';
import type { MongoModelForClass } from './modelTypes';

@pre<EventOccurrenceParticipantModel>('validate', function () {
  if (!this.participantId && this._id) {
    this.participantId = this._id.toString();
  }
})
class EventOccurrenceParticipantModel extends EventOccurrenceParticipantEntity {}

const EventOccurrenceParticipant: MongoModelForClass<typeof EventOccurrenceParticipantModel> = getModelForClass(
  EventOccurrenceParticipantModel,
  {
    options: { customName: 'EventOccurrenceParticipant' },
  },
);

export default EventOccurrenceParticipant;
