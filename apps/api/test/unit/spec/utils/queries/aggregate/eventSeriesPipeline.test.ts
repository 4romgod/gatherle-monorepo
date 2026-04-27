import { transformEventOptionsToPipeline } from '@/utils';
import type { QueryOptionsInput } from '@gatherle/commons/types';
import { FilterOperatorInput, SortOrderInput } from '@gatherle/commons/types';
import type { PipelineStage } from 'mongoose';
import * as filterModule from '@/utils/queries/aggregate/filter';
import * as lookupModule from '@/utils/queries/aggregate/lookup';
import * as sortModule from '@/utils/queries/aggregate/sort';
import * as paginationModule from '@/utils/queries/aggregate/pagination';

describe('transformEventOptionsToPipeline', () => {
  it('should return an empty pipeline when no options are provided', () => {
    const pipeline = transformEventOptionsToPipeline();
    expect(pipeline).toEqual([...lookupModule.createEventLookupStages()]);
  });

  it('should include lookup stages always', () => {
    const lookupStages: PipelineStage.Lookup[] = [
      {
        $lookup: { from: 'eventcategories', localField: 'eventCategories', foreignField: '_id', as: 'eventCategories' },
      },
    ];

    jest.spyOn(lookupModule, 'createEventLookupStages').mockReturnValue(lookupStages);

    const pipeline = transformEventOptionsToPipeline({});
    expect(pipeline).toEqual(lookupStages);
  });

  it('should include sort stages when sort options are provided', () => {
    const sortInput = [{ field: 'capacity', order: SortOrderInput.asc }];
    const sortStages: PipelineStage.Sort[] = [{ $sort: { capacity: 1 } }];

    jest.spyOn(lookupModule, 'createEventLookupStages').mockReturnValue([]);
    jest.spyOn(sortModule, 'createSortStages').mockReturnValue(sortStages);

    const options: QueryOptionsInput = { sort: sortInput };
    const pipeline = transformEventOptionsToPipeline(options);
    expect(pipeline).toEqual([...sortStages]);
  });

  it('should include pagination stages when pagination options are provided', () => {
    const paginationInput = { limit: 10, skip: 5 };
    const paginationStages: PipelineStage[] = [{ $skip: 5 }, { $limit: 10 }];

    jest.spyOn(lookupModule, 'createEventLookupStages').mockReturnValue([]);
    jest.spyOn(paginationModule, 'createPaginationStages').mockReturnValue(paginationStages);

    const options: QueryOptionsInput = { pagination: paginationInput };
    const pipeline = transformEventOptionsToPipeline(options);
    expect(pipeline).toEqual([...paginationStages]);
  });

  it('should include filter stages when filter options are provided', () => {
    const filters = [{ field: 'status', value: 'Completed', operator: FilterOperatorInput.eq }];
    const filterStages: PipelineStage[] = [{ $match: { status: { $eq: 'Completed' } } }];

    jest.spyOn(lookupModule, 'createEventLookupStages').mockReturnValue([]);
    jest.spyOn(filterModule, 'createEventPipelineStages').mockReturnValue(filterStages);

    const options: QueryOptionsInput = { filters };
    const pipeline = transformEventOptionsToPipeline(options);
    expect(pipeline).toEqual([...filterStages]);
  });

  it('should include search stage when search options are provided', () => {
    const searchInput = { fields: ['title'], value: 'Jazz' };
    jest.spyOn(lookupModule, 'createEventLookupStages').mockReturnValue([]);

    const pipeline = transformEventOptionsToPipeline({ search: searchInput });

    expect(pipeline).toHaveLength(1);
    expect(pipeline[0]).toEqual({
      $match: {
        title: expect.any(RegExp),
      },
    });
  });

  it('should combine all stages correctly', () => {
    const sortInput = [{ field: 'capacity', order: SortOrderInput.asc }];
    const paginationInput = { limit: 10, skip: 5 };
    const filters = [{ field: 'status', value: 'Completed', operator: FilterOperatorInput.eq }];

    const lookupStages: PipelineStage.Lookup[] = [
      {
        $lookup: { from: 'eventcategories', localField: 'eventCategories', foreignField: '_id', as: 'eventCategories' },
      },
    ];
    const sortStages: PipelineStage.Sort[] = [{ $sort: { capacity: 1 } }];
    const paginationStages: PipelineStage[] = [{ $skip: 5 }, { $limit: 10 }];
    const filterStages: PipelineStage[] = [{ $match: { status: { $eq: 'Completed' } } }];

    jest.spyOn(lookupModule, 'createEventLookupStages').mockReturnValue(lookupStages);
    jest.spyOn(sortModule, 'createSortStages').mockReturnValue(sortStages);
    jest.spyOn(paginationModule, 'createPaginationStages').mockReturnValue(paginationStages);
    jest.spyOn(filterModule, 'createEventPipelineStages').mockReturnValue(filterStages);

    const options: QueryOptionsInput = { sort: sortInput, pagination: paginationInput, filters };
    const pipeline = transformEventOptionsToPipeline(options);
    expect(pipeline).toEqual([...lookupStages, ...filterStages, ...sortStages, ...paginationStages]);
  });
});
