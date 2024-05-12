import {EventType} from '../../graphql/types';
import {Document, model, Schema} from 'mongoose';

// TODO use mongoose middleware to validate all params, especially arrays for unique items
const EventSchema = new Schema<EventType & Document>(
    {
        slug: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            unique: true,
        },
        description: {
            type: String,
            required: true,
            unique: false,
        },
        startDate: {
            type: String,
            required: true,
            unique: false,
        },
        endDate: {
            type: String,
            required: true,
            unique: false,
        },
        location: {
            type: String,
            required: true,
            unique: false,
        },
        capacity: {
            type: Number,
            required: false,
            unique: false,
        },
        status: {
            type: String,
            required: true,
            unique: false,
            index: true,
        },
        eventCategory: [
            {
                type: Schema.Types.ObjectId,
                ref: 'EventCategory',
                required: true,
                index: true,
            },
        ],
        organizers: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true,
                index: true,
            },
        ],
        rSVPs: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User', // Reference to the User model
                required: true,
                index: true,
            },
        ],
        tags: {
            type: Schema.Types.Mixed,
            default: {},
        },
        media: {
            featuredImageUrl: {type: String},
            otherMediaData: {
                type: Schema.Types.Mixed,
                default: {},
                required: false,
            },
        },
        additionalDetails: {
            type: Schema.Types.Mixed,
            default: {},
        },
        comments: {
            type: Schema.Types.Mixed,
            default: {},
        },
        privacySetting: {
            type: String,
            required: true,
            unique: false,
        },
    },
    {timestamps: true},
);

const Event = model<EventType & Document>('Event', EventSchema);

export default Event;
