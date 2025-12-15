import type {PipelineStage} from 'mongoose';

export const createEventLookupStages = (): PipelineStage.Lookup[] => {
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
        from: 'eventcategories',
        localField: 'eventCategoryList',
        foreignField: '_id',
        as: 'eventCategoryList',
      },
    },
  ];
};
