import {createEventLookupStages} from '@/utils';
import type {PipelineStage} from 'mongoose';

describe('createEventLookupStages', () => {
  it('should return an array of pipeline stages for lookup', () => {
    const expectedLookupStages: PipelineStage[] = [
      {
        $lookup: {
          from: 'eventcategories',
          localField: 'eventCategoryList',
          foreignField: 'eventCategoryId',
          as: 'eventCategoryList',
        },
      },
    ];

    const lookupStages = createEventLookupStages();
    expect(lookupStages).toEqual(expectedLookupStages);
  });

  it('should return the correct number of lookup stages', () => {
    const lookupStages = createEventLookupStages();
    expect(lookupStages.length).toBe(1);
  });

  it('should contain the correct fields in the lookup stage', () => {
    const lookupStages = createEventLookupStages();

    expect(lookupStages[0]).toHaveProperty('$lookup');
    expect(lookupStages[0].$lookup).toHaveProperty('from', 'eventcategories');
    expect(lookupStages[0].$lookup).toHaveProperty('localField', 'eventCategoryList');
    expect(lookupStages[0].$lookup).toHaveProperty('foreignField', 'eventCategoryId');
    expect(lookupStages[0].$lookup).toHaveProperty('as', 'eventCategoryList');
  });
});
