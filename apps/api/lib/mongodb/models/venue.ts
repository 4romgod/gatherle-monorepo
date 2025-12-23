import 'reflect-metadata';
import {getModelForClass, pre} from '@typegoose/typegoose';
import {Venue as VenueEntity} from '@ntlango/commons/types';

@pre<VenueModel>('validate', function (next) {
  try {
    if (!this.venueId && this._id) {
      this.venueId = this._id.toString();
    }
    next();
  } catch (error) {
    next(error as Error);
  }
})
class VenueModel extends VenueEntity {}

const Venue = getModelForClass(VenueModel, {
  options: {customName: 'Venue'},
});

export default Venue;
