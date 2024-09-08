import {EventPrivacySetting, EventStatus, EventType} from '@/graphql/types';
import {kebabCase} from 'lodash';
import {CallbackError, CallbackWithoutResultAndOptionalError, Document, model, Schema} from 'mongoose';

// TODO use mongoose middleware to validate all params, especially arrays for unique items
export const EventSchema = new Schema<EventType & Document>(
  {
    additionalDetails: {
      type: Schema.Types.Mixed,
      default: {},
    },
    capacity: {
      type: Number,
      required: false,
      unique: false,
    },
    comments: {
      type: Schema.Types.Mixed,
      default: {},
    },
    description: {
      type: String,
      required: true,
      unique: false,
    },
    eventCategoryList: [
      {
        type: Schema.Types.ObjectId,
        ref: 'EventCategory',
        required: true,
        index: true,
      },
    ],
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    location: {
      locationType: {
        type: String,
        enum: ['venue', 'online', 'tba'],
        required: true,
      },
      coordinates: {
        latitude: {
          type: Number,
        },
        longitude: {
          type: Number,
        },
      },
      address: {
        street: {
          type: String,
        },
        city: {
          type: String,
        },
        state: {
          type: String,
        },
        zipCode: {
          type: String,
        },
        country: {
          type: String,
        },
      },
      details: {
        type: String,
      },
    },
    media: {
      featuredImageUrl: {
        type: String,
        required: false,
      },
      otherMediaData: {
        type: Schema.Types.Mixed,
        default: {},
        required: false,
      },
    },
    organizerList: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },
    ],
    privacySetting: {
      type: String,
      enum: Object.values(EventPrivacySetting),
      required: false,
      unique: false,
    },
    recurrenceRule: {
      type: String,
      required: false,
      unique: false,
    },
    rSVPList: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
        required: true,
        index: true,
      },
    ],
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(EventStatus),
      required: true,
      unique: false,
      index: true,
    },
    tags: {
      type: Schema.Types.Mixed,
      default: {},
    },
    title: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {timestamps: true},
);

EventSchema.pre('validate', async function (next: CallbackWithoutResultAndOptionalError) {
  try {
    this.eventId = this._id!.toString();

    if (this.isModified('title')) {
      this.slug = kebabCase(this.title);
    }
    next();
  } catch (error) {
    next(error as CallbackError);
  }
});

const Event = model<EventType & Document>('Event', EventSchema);

export default Event;
