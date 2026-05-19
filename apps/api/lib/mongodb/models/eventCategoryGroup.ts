import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { kebabCase } from 'lodash';
import { EventCategoryGroup as EventCategoryGroupEntity } from '@gatherle/commons/types';
import type { MongoModelForClass } from './modelTypes';

@pre<EventCategoryGroupModel>('validate', function () {
  if (!this.eventCategoryGroupId && this._id) {
    this.eventCategoryGroupId = this._id.toString();
  }
  if (this.isNew || !this.slug) {
    this.slug = kebabCase(this.name);
  }
})
class EventCategoryGroupModel extends EventCategoryGroupEntity {}

const EventCategoryGroup: MongoModelForClass<typeof EventCategoryGroupModel> = getModelForClass(
  EventCategoryGroupModel,
  {
    options: { customName: 'EventCategoryGroup' },
  },
);

export default EventCategoryGroup;
