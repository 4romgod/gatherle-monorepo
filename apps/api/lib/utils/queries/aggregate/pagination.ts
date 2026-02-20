import type { PaginationInput } from '@gatherle/commons/types';
import type { PipelineStage } from 'mongoose';

export const createPaginationStages = (paginationInput: PaginationInput): PipelineStage[] => {
  const stages: PipelineStage[] = [];
  if (paginationInput.skip) {
    stages.push({ $skip: paginationInput.skip });
  }
  if (paginationInput.limit) {
    stages.push({ $limit: paginationInput.limit });
  }
  return stages;
};
