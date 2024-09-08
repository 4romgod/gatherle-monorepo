import {createSortStages} from '@/utils';
import {PipelineStage} from 'mongoose';
import {SortInput, SortOrderInput} from '@/graphql/types';

describe('createSortStages', () => {
  it('should return a valid sort pipeline stage for given sort inputs', () => {
    const sortInput: SortInput[] = [
      {field: 'capacity', order: SortOrderInput.asc},
      {field: 'startDateTime', order: SortOrderInput.desc},
    ];
    const expectedSortStage: PipelineStage.Sort[] = [
      {
        $sort: {
          capacity: 1,
          startDateTime: -1,
        },
      },
    ];

    const sortStages = createSortStages(sortInput);
    expect(sortStages).toEqual(expectedSortStage);
  });

  it('should return an empty sort pipeline stage when no sort inputs are provided', () => {
    const sortInput: SortInput[] = [];
    const expectedSortStage: PipelineStage.Sort[] = [
      {
        $sort: {},
      },
    ];

    const sortStages = createSortStages(sortInput);
    expect(sortStages).toEqual(expectedSortStage);
  });

  it('should handle single sort input correctly', () => {
    const sortInput: SortInput[] = [{field: 'endDateTime', order: SortOrderInput.desc}];
    const expectedSortStage: PipelineStage.Sort[] = [
      {
        $sort: {
          endDateTime: -1,
        },
      },
    ];

    const sortStages = createSortStages(sortInput);
    expect(sortStages).toEqual(expectedSortStage);
  });

  it('should handle different order values correctly', () => {
    const sortInput: SortInput[] = [
      {field: 'title', order: SortOrderInput.desc},
      {field: 'location', order: SortOrderInput.asc},
    ];
    const expectedSortStage: PipelineStage.Sort[] = [
      {
        $sort: {
          title: -1,
          location: 1,
        },
      },
    ];

    const sortStages = createSortStages(sortInput);
    expect(sortStages).toEqual(expectedSortStage);
  });
});
