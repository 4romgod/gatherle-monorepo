import {createEventPipelineStages} from '@/utils'; // Adjust the import path as necessary
import type {PipelineStage} from 'mongoose';
import type {FilterInput} from '@ntlango/commons/types';
import { FilterOperatorInput} from '@ntlango/commons/types';

describe('createEventPipelineStages', () => {
  it('should return a valid pipeline for simple equality filters', () => {
    const filters: FilterInput[] = [{field: 'status', value: 'Completed', operator: FilterOperatorInput.eq}];
    const expectedPipeline: PipelineStage[] = [
      {
        $match: {
          status: {$eq: 'Completed'},
        },
      },
    ];

    const pipelineStages = createEventPipelineStages(filters);
    expect(pipelineStages).toEqual(expectedPipeline);
  });

  it('should return a valid pipeline for nested field filters', () => {
    const filters: FilterInput[] = [{field: 'organizerList.email', value: 'jay@rocknation.com', operator: FilterOperatorInput.eq}];
    const expectedPipeline: PipelineStage[] = [
      {
        $addFields: {
          'value.organizerList': {
            $filter: {
              input: '$organizerList',
              as: 'organizerListItem',
              cond: {
                $eq: ['$$organizerListItem.email', 'jay@rocknation.com'],
              },
            },
          },
        },
      },
      {
        $match: {
          'value.organizerList.0.email': {$eq: 'jay@rocknation.com'},
        },
      },
    ];

    const pipelineStages = createEventPipelineStages(filters);
    expect(pipelineStages).toEqual(expectedPipeline);
  });

  it('should return a valid pipeline for different operators', () => {
    const filters: FilterInput[] = [{field: 'capacity', value: 50, operator: FilterOperatorInput.gt}];
    const expectedPipeline: PipelineStage[] = [
      {
        $match: {
          capacity: {$gt: 50},
        },
      },
    ];

    const pipelineStages = createEventPipelineStages(filters);
    expect(pipelineStages).toEqual(expectedPipeline);
  });

  it('should handle multiple filters correctly', () => {
    const filters: FilterInput[] = [
      {field: 'status', value: 'Completed', operator: FilterOperatorInput.eq},
      {field: 'capacity', value: 50, operator: FilterOperatorInput.gte},
    ];
    const expectedPipeline: PipelineStage[] = [
      {
        $match: {
          status: {$eq: 'Completed'},
          capacity: {$gte: 50},
        },
      },
    ];

    const pipelineStages = createEventPipelineStages(filters);
    expect(pipelineStages).toEqual(expectedPipeline);
  });

  it('should handle nested field filters with different operators', () => {
    const filters: FilterInput[] = [{field: 'eventCategoryList.name', value: 'Arts', operator: FilterOperatorInput.ne}];
    const expectedPipeline: PipelineStage[] = [
      {
        $addFields: {
          'value.eventCategoryList': {
            $filter: {
              input: '$eventCategoryList',
              as: 'eventCategoryListItem',
              cond: {
                $eq: ['$$eventCategoryListItem.name', 'Arts'],
              },
            },
          },
        },
      },
      {
        $match: {
          'value.eventCategoryList.0.name': {$ne: 'Arts'},
        },
      },
    ];

    const pipelineStages = createEventPipelineStages(filters);
    expect(pipelineStages).toEqual(expectedPipeline);
  });
});
