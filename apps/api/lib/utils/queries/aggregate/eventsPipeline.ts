import type {QueryOptionsInput} from '@ntlango/commons/types';
import type {PipelineStage} from 'mongoose';
import {createEventPipelineStages} from './filter';
import {createEventLookupStages} from './lookup';
import {createSortStages} from './sort';
import {createPaginationStages} from './pagination';

export const transformOptionsToPipeline = (options?: QueryOptionsInput): PipelineStage[] => {
  const pipeline: PipelineStage[] = [];
  pipeline.push(...createEventLookupStages());

  if (options) {
    const {filters, sort, pagination} = options;

    if (filters) {
      pipeline.push(...createEventPipelineStages(filters));
    }

    if (sort) {
      pipeline.push(...createSortStages(sort));
    }

    if (pagination) {
      pipeline.push(...createPaginationStages(pagination));
    }
  }

  return pipeline;
};
