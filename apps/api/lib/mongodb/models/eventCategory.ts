import {EventCategoryType} from '@/graphql/types';
import {model, Schema, Document} from 'mongoose';

export const EventCategorySchema = new Schema<EventCategoryType & Document>(
    {
        slug: {type: String, required: true, unique: true, index: true},
        name: {type: String, required: true, unique: true},
        iconName: {type: String, required: true},
        description: {type: String, required: true},
        color: {type: String, required: false},
    },
    {timestamps: true},
);

const EventCategory = model<EventCategoryType & Document>('EventCategory', EventCategorySchema);

export default EventCategory;
