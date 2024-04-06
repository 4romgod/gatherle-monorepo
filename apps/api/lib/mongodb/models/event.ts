import {IEvent} from '../../interface';
import {Document, model, Schema} from 'mongoose';

// TODO use mongoose middleware to validate all params, especially arrays for unique items
const EventSchema = new Schema<IEvent & Document>(
    {
        title: {type: String, required: true, unique: false},
        description: {type: String, required: true, unique: false},
        startDate: {type: String, required: true, unique: false},
        endDate: {type: String, required: true, unique: false},
        location: {type: String, required: true, unique: false},
        eventType: [{type: String, required: true, unique: false}],
        eventCategory: [{type: String, required: true, unique: false}],
        capacity: {type: Number, required: false, unique: false},
        status: {type: String, required: true, unique: false},
        organizers: [{type: String, required: true}],
        rSVPs: [{type: String, required: true}],
        tags: {
            type: Schema.Types.Mixed,
            default: {},
        },
        media: {
            type: Schema.Types.Mixed,
            default: {},
        },
        additionalDetails: {
            type: Schema.Types.Mixed,
            default: {},
        },
        comments: {
            type: Schema.Types.Mixed,
            default: {},
        },
        privacySetting: {type: String, required: true, unique: false},
    },
    {timestamps: true},
);

const Event = model<IEvent & Document>('Event', EventSchema);

export default Event;
