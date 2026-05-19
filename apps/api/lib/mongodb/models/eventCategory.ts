import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { kebabCase } from 'lodash';
import { EventCategory as EventCategoryEntity } from '@gatherle/commons/types';
import type { MongoModelForClass } from './modelTypes';

@pre<EventCategoryModel>('validate', function () {
  if (!this.eventCategoryId && this._id) {
    this.eventCategoryId = this._id.toString();
  }
  if (this.isNew || !this.slug) {
    this.slug = kebabCase(this.name);
  }
})
class EventCategoryModel extends EventCategoryEntity {}

const EventCategory: MongoModelForClass<typeof EventCategoryModel> = getModelForClass(EventCategoryModel, {
  options: { customName: 'EventCategory' },
});

export default EventCategory;
