import {createEventLookupStages} from '@/utils';
import {PipelineStage} from 'mongoose';

describe('createEventLookupStages', () => {
  it('should return an array of pipeline stages for lookup', () => {
    const expectedLookupStages: PipelineStage[] = [
      {
        $lookup: {
          from: 'users',
          localField: 'organizerList',
          foreignField: '_id',
          as: 'organizerList',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'rSVPList',
          foreignField: '_id',
          as: 'rSVPList',
        },
      },
      {
        $lookup: {
          from: 'eventcategories',
          localField: 'eventCategoryList',
          foreignField: '_id',
          as: 'eventCategoryList',
        },
      },
    ];

    const lookupStages = createEventLookupStages();
    expect(lookupStages).toEqual(expectedLookupStages);
  });

  it('should return the correct number of lookup stages', () => {
    const lookupStages = createEventLookupStages();
    expect(lookupStages.length).toBe(3);
  });

  it('should contain the correct fields in each lookup stage', () => {
    const lookupStages = createEventLookupStages();

    expect(lookupStages[0]).toHaveProperty('$lookup');
    expect(lookupStages[0].$lookup).toHaveProperty('from', 'users');
    expect(lookupStages[0].$lookup).toHaveProperty('localField', 'organizerList');
    expect(lookupStages[0].$lookup).toHaveProperty('foreignField', '_id');
    expect(lookupStages[0].$lookup).toHaveProperty('as', 'organizerList');

    expect(lookupStages[1]).toHaveProperty('$lookup');
    expect(lookupStages[1].$lookup).toHaveProperty('from', 'users');
    expect(lookupStages[1].$lookup).toHaveProperty('localField', 'rSVPList');
    expect(lookupStages[1].$lookup).toHaveProperty('foreignField', '_id');
    expect(lookupStages[1].$lookup).toHaveProperty('as', 'rSVPList');

    expect(lookupStages[2]).toHaveProperty('$lookup');
    expect(lookupStages[2].$lookup).toHaveProperty('from', 'eventcategories');
    expect(lookupStages[2].$lookup).toHaveProperty('localField', 'eventCategoryList');
    expect(lookupStages[2].$lookup).toHaveProperty('foreignField', '_id');
    expect(lookupStages[2].$lookup).toHaveProperty('as', 'eventCategoryList');
  });
});
