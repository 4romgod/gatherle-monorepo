import {createEventPipelineStages, createLocationMatchStage} from '@/utils';
import {PipelineStage} from 'mongoose';
import {FilterInput, LocationFilterInput} from '@ntlango/commons/types';
import {FilterOperatorInput} from '@ntlango/commons/types';

describe('createEventPipelineStages', () => {
  it('should return a valid pipeline for simple equality filters', () => {
    const filters: FilterInput[] = [
      {
        field: 'status',
        value: 'Completed',
        operator: FilterOperatorInput.eq,
      },
    ];
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
    const filters: FilterInput[] = [{field: 'organizers.email', value: 'jay@rocknation.com', operator: FilterOperatorInput.eq}];
    const expectedPipeline: PipelineStage[] = [
      {
        $match: {
          'organizers.email': {$eq: 'jay@rocknation.com'},
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
          $and: [
            {status: {$eq: 'Completed'}},
            {capacity: {$gte: 50}},
          ],
        },
      },
    ];

    const pipelineStages = createEventPipelineStages(filters);
    expect(pipelineStages).toEqual(expectedPipeline);
  });

  it('should handle nested field filters with different operators', () => {
    const filters: FilterInput[] = [{field: 'eventCategories.name', value: 'Arts', operator: FilterOperatorInput.ne}];
    const expectedPipeline: PipelineStage[] = [
      {
        $match: {
          'eventCategories.name': {$ne: 'Arts'},
        },
      },
    ];

    const pipelineStages = createEventPipelineStages(filters);
    expect(pipelineStages).toEqual(expectedPipeline);
  });

  it('should use $in when a filter value is an array', () => {
    const filters: FilterInput[] = [
      {field: 'status', value: ['Upcoming', 'Ongoing'], operator: FilterOperatorInput.eq},
    ];
    const expectedPipeline: PipelineStage[] = [
      {
        $match: {
          status: {$in: ['Upcoming', 'Ongoing']},
        },
      },
    ];

    const pipelineStages = createEventPipelineStages(filters);
    expect(pipelineStages).toEqual(expectedPipeline);
  });

  it('should use $nin when a filter value array uses ne operator', () => {
    const filters: FilterInput[] = [
      {field: 'status', value: ['Cancelled', 'Completed'], operator: FilterOperatorInput.ne},
    ];
    const expectedPipeline: PipelineStage[] = [
      {
        $match: {
          status: {$nin: ['Cancelled', 'Completed']},
        },
      },
    ];

    const pipelineStages = createEventPipelineStages(filters);
    expect(pipelineStages).toEqual(expectedPipeline);
  });
});

describe('createLocationMatchStage', () => {
  it('should return empty array when no location filters provided', () => {
    const location: LocationFilterInput = {};
    const stages = createLocationMatchStage(location);
    expect(stages).toEqual([]);
  });

  it('should filter by city (case-insensitive)', () => {
    const location: LocationFilterInput = {city: 'London'};
    const stages = createLocationMatchStage(location);
    expect(stages).toEqual([
      {
        $match: {
          'location.address.city': {$regex: 'London', $options: 'i'},
        },
      },
    ]);
  });

  it('should filter by state/province (case-insensitive)', () => {
    const location: LocationFilterInput = {state: 'California'};
    const stages = createLocationMatchStage(location);
    expect(stages).toEqual([
      {
        $match: {
          'location.address.state': {$regex: 'California', $options: 'i'},
        },
      },
    ]);
  });

  it('should filter by country (case-insensitive)', () => {
    const location: LocationFilterInput = {country: 'United States'};
    const stages = createLocationMatchStage(location);
    expect(stages).toEqual([
      {
        $match: {
          'location.address.country': {$regex: 'United States', $options: 'i'},
        },
      },
    ]);
  });

  it('should combine city, state, and country filters', () => {
    const location: LocationFilterInput = {
      city: 'San Francisco',
      state: 'California',
      country: 'USA',
    };
    const stages = createLocationMatchStage(location);
    expect(stages).toEqual([
      {
        $match: {
          'location.address.city': {$regex: 'San Francisco', $options: 'i'},
          'location.address.state': {$regex: 'California', $options: 'i'},
          'location.address.country': {$regex: 'USA', $options: 'i'},
        },
      },
    ]);
  });

  it('should filter by geospatial proximity with default 50km radius', () => {
    const location: LocationFilterInput = {
      latitude: 51.5074,  // London coordinates
      longitude: -0.1278,
    };
    const stages = createLocationMatchStage(location);

    // Should produce 4 stages: coordinate existence check, $addFields (distance calc), $match (distance filter), $project (cleanup)
    expect(stages).toHaveLength(4);
    expect(stages[0]).toEqual({
      $match: {
        'location.coordinates.latitude': {$exists: true, $ne: null},
        'location.coordinates.longitude': {$exists: true, $ne: null},
      },
    });
    expect(stages[1]).toHaveProperty('$addFields._distanceKm');
    expect(stages[2]).toEqual({
      $match: {
        _distanceKm: {$lte: 50}, // Default 50km
      },
    });
    expect(stages[3]).toEqual({$project: {_distanceKm: 0}});
  });

  it('should filter by geospatial proximity with custom radius', () => {
    const location: LocationFilterInput = {
      latitude: 40.7128,  // New York coordinates
      longitude: -74.006,
      radiusKm: 25,       // 25km radius
    };
    const stages = createLocationMatchStage(location);

    // Should produce 4 stages: coordinate existence check, $addFields (distance calc), $match (distance filter), $project (cleanup)
    expect(stages).toHaveLength(4);
    expect(stages[0]).toEqual({
      $match: {
        'location.coordinates.latitude': {$exists: true, $ne: null},
        'location.coordinates.longitude': {$exists: true, $ne: null},
      },
    });
    expect(stages[1]).toHaveProperty('$addFields._distanceKm');
    expect(stages[2]).toEqual({
      $match: {
        _distanceKm: {$lte: 25}, // Custom 25km radius
      },
    });
    expect(stages[3]).toEqual({$project: {_distanceKm: 0}});
  });

  it('should combine text and geospatial filters with $and (all must match)', () => {
    const location: LocationFilterInput = {
      country: 'UK',
      latitude: 51.5074,
      longitude: -0.1278,
      radiusKm: 100,
    };
    const stages = createLocationMatchStage(location);

    // Should produce 5 stages: text $match, coordinate existence check, $addFields, distance $match, $project
    expect(stages).toHaveLength(5);
    expect(stages[0]).toEqual({
      $match: {
        'location.address.country': {$regex: 'UK', $options: 'i'},
      },
    });
    expect(stages[1]).toEqual({
      $match: {
        'location.coordinates.latitude': {$exists: true, $ne: null},
        'location.coordinates.longitude': {$exists: true, $ne: null},
      },
    });
    expect(stages[2]).toHaveProperty('$addFields._distanceKm');
    expect(stages[3]).toEqual({
      $match: {
        _distanceKm: {$lte: 100},
      },
    });
    expect(stages[4]).toEqual({$project: {_distanceKm: 0}});
  });

  it('should combine multiple text fields with geospatial filter', () => {
    const location: LocationFilterInput = {
      city: 'London',
      state: 'England',
      country: 'UK',
      latitude: 51.5074,
      longitude: -0.1278,
      radiusKm: 50,
    };
    const stages = createLocationMatchStage(location);

    // Should produce 5 stages: text $match, coordinate existence check, $addFields, distance $match, $project
    expect(stages).toHaveLength(5);
    expect(stages[0]).toEqual({
      $match: {
        'location.address.city': {$regex: 'London', $options: 'i'},
        'location.address.state': {$regex: 'England', $options: 'i'},
        'location.address.country': {$regex: 'UK', $options: 'i'},
      },
    });
    expect(stages[1]).toEqual({
      $match: {
        'location.coordinates.latitude': {$exists: true, $ne: null},
        'location.coordinates.longitude': {$exists: true, $ne: null},
      },
    });
    expect(stages[2]).toHaveProperty('$addFields._distanceKm');
    expect(stages[3]).toEqual({
      $match: {
        _distanceKm: {$lte: 50},
      },
    });
    expect(stages[4]).toEqual({$project: {_distanceKm: 0}});
  });

  it('should ignore coordinates if only latitude is provided (no longitude)', () => {
    const location: LocationFilterInput = {
      latitude: 51.5074,
      city: 'London',
    };
    const stages = createLocationMatchStage(location);

    // Should only have city filter, not geospatial
    expect(stages).toEqual([
      {
        $match: {
          'location.address.city': {$regex: 'London', $options: 'i'},
        },
      },
    ]);
  });

  it('should ignore coordinates if only longitude is provided (no latitude)', () => {
    const location: LocationFilterInput = {
      longitude: -0.1278,
      city: 'London',
    };
    const stages = createLocationMatchStage(location);

    // Should only have city filter, not geospatial
    expect(stages).toEqual([
      {
        $match: {
          'location.address.city': {$regex: 'London', $options: 'i'},
        },
      },
    ]);
  });
});
