import type { EventsQueryOptionsInput } from '@gatherle/commons/types';
import type { PipelineStage } from 'mongoose';
import { createEventPipelineStages, createLocationMatchStage, createTextSearchMatchStage } from './filter';
import { createEventLookupStages } from './lookup';
import { createSortStages } from './sort';
import { createPaginationStages } from './pagination';
import { logger } from '@/utils/logger';

export const transformEventOptionsToPipeline = (options?: EventsQueryOptionsInput): PipelineStage[] => {
  const pipeline: PipelineStage[] = [];
  pipeline.push(...createEventLookupStages());

  if (options) {
    const { filters, sort, pagination, location, search } = options;

    if (location) {
      pipeline.push(...createLocationMatchStage(location));
    }

    if (search) {
      const searchStage = createTextSearchMatchStage(search);
      if (searchStage) {
        pipeline.push(searchStage);
      }
    }

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

  logger.debug('[transformEventOptionsToPipeline] MongoDB aggregation pipeline:', {
    pipeline,
  });

  return pipeline;
};
