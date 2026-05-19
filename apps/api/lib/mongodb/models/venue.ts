import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { kebabCase } from 'lodash';
import { Venue as VenueEntity } from '@gatherle/commons/types';
import type { MongoModelForClass } from './modelTypes';

@pre<VenueModel>('validate', function () {
  if (!this.venueId && this._id) {
    this.venueId = this._id.toString();
  }
  if (this.isNew || !this.slug) {
    this.slug = kebabCase(this.name ?? this.venueId ?? 'venue');
  } else {
    this.slug = kebabCase(this.slug);
  }
})
class VenueModel extends VenueEntity {}

const Venue: MongoModelForClass<typeof VenueModel> = getModelForClass(VenueModel, {
  options: { customName: 'Venue' },
});

export default Venue;
