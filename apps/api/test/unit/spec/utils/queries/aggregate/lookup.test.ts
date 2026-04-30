import { createEventLookupStages } from '@/utils';
import type { PipelineStage } from 'mongoose';

describe('createEventLookupStages', () => {
  it('should return an array of pipeline stages for lookup', () => {
    const lookupStages = createEventLookupStages();
    expect(Array.isArray(lookupStages)).toBe(true);
    expect(lookupStages.length).toBeGreaterThan(0);
  });

  it('should return the correct number of pipeline stages', () => {
    const lookupStages = createEventLookupStages();
    expect(lookupStages.length).toBe(8);
  });

  it('should contain the correct fields in the eventCategories lookup stage', () => {
    const lookupStages = createEventLookupStages();
    const firstStage = lookupStages[0] as PipelineStage.Lookup;

    expect(firstStage).toHaveProperty('$lookup');
    expect(firstStage.$lookup).toHaveProperty('from', 'eventcategories');
    expect(firstStage.$lookup).toHaveProperty('localField', 'eventCategories');
    expect(firstStage.$lookup).toHaveProperty('foreignField', 'eventCategoryId');
    expect(firstStage.$lookup).toHaveProperty('as', 'eventCategories');
  });

  it('should contain the organizers lookup stage with pipeline optimization', () => {
    const lookupStages = createEventLookupStages();
    const secondStage = lookupStages[1] as PipelineStage.Lookup;

    expect(secondStage).toHaveProperty('$lookup');
    expect(secondStage.$lookup).toHaveProperty('from', 'users');
    expect(secondStage.$lookup).toHaveProperty('let');
    expect(secondStage.$lookup).toHaveProperty('pipeline');
    expect(secondStage.$lookup).toHaveProperty('as', 'organizersUsersMap');

    // Verify the pipeline uses $in for efficient filtering
    const pipeline = secondStage.$lookup.pipeline as any[];
    expect(pipeline).toBeDefined();
    expect(pipeline.length).toBeGreaterThan(0);
    expect(pipeline[0]).toHaveProperty('$match');
  });

  it('should contain the follows lookup stage used for savedByCount', () => {
    const lookupStages = createEventLookupStages();
    const savedByLookupStage = lookupStages[5] as PipelineStage.Lookup;

    expect(savedByLookupStage).toHaveProperty('$lookup');
    expect(savedByLookupStage.$lookup).toHaveProperty('from', 'follows');
    expect(savedByLookupStage.$lookup).toHaveProperty('let');
    expect(savedByLookupStage.$lookup).toHaveProperty('pipeline');
    expect(savedByLookupStage.$lookup).toHaveProperty('as', 'savedByCountAggregation');
  });

  it('should add savedByCount from the follows aggregation', () => {
    const lookupStages = createEventLookupStages();
    const addFieldsStage = lookupStages[6] as PipelineStage.AddFields;

    expect(addFieldsStage.$addFields).toHaveProperty('savedByCount');
  });

  it('should compute savedByCount via follows lookup stage', () => {
    const lookupStages = createEventLookupStages();
    const savedByLookupStage = lookupStages[5] as PipelineStage.Lookup;

    expect(savedByLookupStage.$lookup.from).toBe('follows');
    expect(savedByLookupStage.$lookup.let).toBeDefined();
    expect(savedByLookupStage.$lookup.pipeline).toBeDefined();
  });

  it('projects away the temporary savedBy aggregation array', () => {
    const lookupStages = createEventLookupStages();
    const projectStage = lookupStages[7] as PipelineStage.Project;

    expect(projectStage.$project).toHaveProperty('savedByCountAggregation', 0);
  });

  describe('skipCounts option', () => {
    it('returns 6 stages when skipCounts is true (omits follows lookup and count addFields)', () => {
      const stages = createEventLookupStages({ skipCounts: true });
      expect(stages.length).toBe(6);
    });

    it('still includes the eventcategories and organizers lookup stages', () => {
      const stages = createEventLookupStages({ skipCounts: true });
      const categoriesStage = stages[0] as PipelineStage.Lookup;
      const organizersStage = stages[1] as PipelineStage.Lookup;
      expect(categoriesStage.$lookup.from).toBe('eventcategories');
      expect(organizersStage.$lookup.from).toBe('users');
    });

    it('does not include a follows savedByCount lookup stage', () => {
      const stages = createEventLookupStages({ skipCounts: true });
      const hasFollowsLookup = stages.some(
        (s) => '$lookup' in s && (s as PipelineStage.Lookup).$lookup.from === 'follows',
      );
      expect(hasFollowsLookup).toBe(false);
    });

    it('returns 8 stages by default (skipCounts absent)', () => {
      expect(createEventLookupStages().length).toBe(8);
    });

    it('returns 8 stages when skipCounts is false', () => {
      expect(createEventLookupStages({ skipCounts: false }).length).toBe(8);
    });
  });
});
