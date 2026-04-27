import 'reflect-metadata';
import { getModelForClass } from '@typegoose/typegoose';
import { EventOccurrence as EventOccurrenceEntity } from '@gatherle/commons/types';

class EventOccurrenceModel extends EventOccurrenceEntity {}

const EventOccurrence = getModelForClass(EventOccurrenceModel, {
  options: { customName: 'EventOccurrence' },
});

export default EventOccurrence;
