import {PipelineStage} from 'mongoose';

export const createEventLookupStages = (): PipelineStage[] => {
    return [
        {
            $lookup: {
                from: 'users',
                localField: 'organizerList',
                foreignField: '_id',
                as: 'organizerList',
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: 'rSVPList',
                foreignField: '_id',
                as: 'rSVPList',
            },
        },
        {
            $lookup: {
                from: 'eventcategories',
                localField: 'eventCategoryList',
                foreignField: '_id',
                as: 'eventCategoryList',
            },
        },
    ];
};
