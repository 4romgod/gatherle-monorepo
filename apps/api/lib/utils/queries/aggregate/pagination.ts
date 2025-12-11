import {PaginationInput} from '@ntlango/commons/types';
import {PipelineStage} from 'mongoose';

export const createPaginationStages = (paginationInput: PaginationInput): PipelineStage[] => {
  const stages: PipelineStage[] = [];
  if (paginationInput.skip) {
    stages.push({$skip: paginationInput.skip});
  }
  if (paginationInput.limit) {
    stages.push({$limit: paginationInput.limit});
  }
  return stages;
};
