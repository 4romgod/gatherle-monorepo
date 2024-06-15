import {EventType} from '@/graphql/types';
import {Document, model, Schema} from 'mongoose';

// TODO use mongoose middleware to validate all params, especially arrays for unique items
export const EventSchema = new Schema<EventType & Document>(
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
        startDateTime: {
            type: String,
            required: true,
            unique: false,
        },
        endDateTime: {
            type: String,
            required: true,
            unique: false,
        },
        recurrenceRule: {
            type: String,
            required: false,
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
        eventCategoryList: [
            {
                type: Schema.Types.ObjectId,
                ref: 'EventCategory',
                required: true,
                index: true,
            },
        ],
        organizerList: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true,
                index: true,
            },
        ],
        rSVPList: [
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
            required: false,
            unique: false,
        },
    },
    {timestamps: true},
);

const Event = model<EventType & Document>('Event', EventSchema);

export default Event;
