import type { PaginationInput } from '@gatherle/commons/types';
import type { PipelineStage } from 'mongoose';
import { validatePaginationInput } from '../validation';

export const createPaginationStages = (paginationInput: PaginationInput): PipelineStage[] => {
  const stages: PipelineStage[] = [];
  const validatedPagination = validatePaginationInput(paginationInput);

  if (typeof validatedPagination.skip === 'number' && validatedPagination.skip > 0) {
    stages.push({ $skip: validatedPagination.skip });
  }

  if (typeof validatedPagination.limit === 'number') {
    stages.push({ $limit: validatedPagination.limit });
  }

  return stages;
};
