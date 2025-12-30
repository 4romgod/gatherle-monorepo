import type {PipelineStage} from 'mongoose';

export const createEventLookupStages = (): PipelineStage.Lookup[] => {
  return [
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
