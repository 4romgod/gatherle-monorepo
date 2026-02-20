import 'reflect-metadata';
import { getModelForClass, pre } from '@typegoose/typegoose';
import { kebabCase } from 'lodash';
import { Venue as VenueEntity } from '@gatherle/commons/types';

@pre<VenueModel>('validate', function (next) {
  try {
    if (!this.venueId && this._id) {
      this.venueId = this._id.toString();
    }
    if (this.isNew || !this.slug) {
      this.slug = kebabCase(this.name ?? this.venueId ?? 'venue');
    } else {
      this.slug = kebabCase(this.slug);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
})
class VenueModel extends VenueEntity {}

const Venue = getModelForClass(VenueModel, {
  options: { customName: 'Venue' },
});

export default Venue;
