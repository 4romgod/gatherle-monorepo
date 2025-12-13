import {getModelForClass, pre} from '@typegoose/typegoose';
import {EventParticipant as EventParticipantEntity} from '@ntlango/commons/types';

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

const EventParticipant = getModelForClass(EventParticipantModel, {
  options: {customName: 'EventParticipant'},
});

export default EventParticipant;
