import {IEventCategory} from '../../interface';
import {model, Schema, Document} from 'mongoose';

const EventCategorySchema = new Schema<IEventCategory & Document>(
    {
        name: {type: String, required: true, unique: true},
        iconName: {type: String, required: true},
        description: {type: String, required: true},
        color: {type: String, required: true},
    },
    {timestamps: true},
);

const EventCategory = model<IEventCategory & Document>('EventCategory', EventCategorySchema);

export default EventCategory;
