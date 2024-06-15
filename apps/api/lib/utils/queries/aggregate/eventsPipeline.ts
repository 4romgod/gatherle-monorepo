import {QueryOptionsInput} from '@/graphql/types';
import {PipelineStage} from 'mongoose';
import {createEventPipelineStages} from './filter';
import {createEventLookupStages} from './lookup';
import {createSortStages} from './sort';
import {createPaginationStages} from './pagination';

export const transformOptionsToPipeline = (options?: QueryOptionsInput): PipelineStage[] => {
    const pipeline: PipelineStage[] = [];

    if (options) {
        const {filters, sort, pagination} = options;
        pipeline.push(...createEventLookupStages());

        if (sort) {
            pipeline.push(...createSortStages(sort));
        }

        if (pagination) {
            pipeline.push(...createPaginationStages(pagination));
        }

        if (filters) {
            pipeline.push(...createEventPipelineStages(filters));
        }
    }

    return pipeline;
};
