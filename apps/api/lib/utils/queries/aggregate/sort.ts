import type { SortInput } from '@gatherle/commons/types';
import type { PipelineStage } from 'mongoose';

export const createSortStages = (sortInput: SortInput[]): PipelineStage.Sort[] => {
  const sortOptions: PipelineStage.Sort = {
    $sort: {},
  };
  sortInput.forEach(({ field, order }) => {
    sortOptions.$sort[field] = order === 'asc' ? 1 : -1;
  });
  return [sortOptions];
};
