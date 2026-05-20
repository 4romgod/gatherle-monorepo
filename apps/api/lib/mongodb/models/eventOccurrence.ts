import 'reflect-metadata';
import { getModelForClass } from '@typegoose/typegoose';
import { EventOccurrence as EventOccurrenceEntity } from '@gatherle/commons/types';
import type { MongoModelForClass } from './modelTypes';

class EventOccurrenceModel extends EventOccurrenceEntity {}

const EventOccurrence: MongoModelForClass<typeof EventOccurrenceModel> = getModelForClass(EventOccurrenceModel, {
  options: { customName: 'EventOccurrence' },
});

export default EventOccurrence;
