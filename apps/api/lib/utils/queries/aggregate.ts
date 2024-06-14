import {FilterInput, PaginationInput, QueryOptionsInput, SortInput} from '@/graphql/types';
import {PipelineStage} from 'mongoose';

const createFilterStages = (filters: FilterInput[]): PipelineStage[] => {
    const match: any = {};

    filters.forEach(({field, value, operator}) => {
        const fieldParts = field.split('.');
        console.log('fieldParts', fieldParts);
        if (fieldParts.length > 1) {
            const [root, ...nested] = fieldParts;
            const nestedField = nested.join('.');
            // match[`${root}.${nestedField}`] = { [`$${operator || 'eq'}`]: value };
            match[root] = {
                $elemMatch: {
                    [nestedField]: value,
                },
            };
        } else {
            match[field] = {[`$${operator || 'eq'}`]: value};
        }
    });

    return [{$match: match}];
};

const createSortStage = (sortInput: SortInput[]): PipelineStage => {
    const sortOptions: any = {};
    sortInput.forEach(({field, order}) => {
        sortOptions[field] = order === 'asc' ? 1 : -1;
    });
    return {$sort: sortOptions};
};

const createPaginationStages = (paginationInput: PaginationInput): PipelineStage[] => {
    const stages: PipelineStage[] = [];
    if (paginationInput.skip) {
        stages.push({$skip: paginationInput.skip});
    }
    if (paginationInput.limit) {
        stages.push({$limit: paginationInput.limit});
    }
    return stages;
};

export const transformOptionsToPipeline = (options: QueryOptionsInput): PipelineStage[] => {
    const pipeline: PipelineStage[] = [];
    const {filters, sort, pagination} = options;

    if (filters) {
        pipeline.push(...createFilterStages(filters));
    }

    if (sort) {
        pipeline.push(createSortStage(sort));
    }

    if (pagination) {
        pipeline.push(...createPaginationStages(pagination));
    }

    return pipeline;
};
