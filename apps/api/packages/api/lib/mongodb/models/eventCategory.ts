import {EventCategoryType} from '@/graphql/types';
import {kebabCase} from 'lodash';
import {model, Schema, Document, CallbackWithoutResultAndOptionalError, CallbackError} from 'mongoose';

export const EventCategorySchema = new Schema<EventCategoryType & Document>(
  {
    eventCategoryId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      unique: true,
    },
    iconName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: false,
    },
  },
  {timestamps: true},
);

EventCategorySchema.pre('validate', async function (next: CallbackWithoutResultAndOptionalError) {
  try {
    this.eventCategoryId = this._id!.toString();
    if (this.isModified('name')) {
      this.slug = kebabCase(this.name);
    }
    next();
  } catch (error) {
    next(error as CallbackError);
  }
});

const EventCategory = model('EventCategory', EventCategorySchema);

export default EventCategory;
