import {createEventLookupStages} from '@/utils';
import type {PipelineStage} from 'mongoose';

describe('createEventLookupStages', () => {
  it('should return an array of pipeline stages for lookup', () => {
    const lookupStages = createEventLookupStages();
    expect(Array.isArray(lookupStages)).toBe(true);
    expect(lookupStages.length).toBeGreaterThan(0);
  });

  it('should return the correct number of pipeline stages', () => {
    const lookupStages = createEventLookupStages();
    // Includes:
    // - eventCategories: $lookup
    // - organizers: $lookup users, $addFields (create map), $addFields (reconstruct organizers), $project
    // - participants: $lookup participants, $lookup users, $addFields (create map), $addFields (enrich participants), $project
    expect(lookupStages.length).toBe(10);
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

  it('should contain the participants lookup stage', () => {
    const lookupStages = createEventLookupStages();
    const participantsStage = lookupStages[5] as PipelineStage.Lookup;

    expect(participantsStage).toHaveProperty('$lookup');
    expect(participantsStage.$lookup).toHaveProperty('from', 'eventparticipants');
    expect(participantsStage.$lookup).toHaveProperty('localField', 'eventId');
    expect(participantsStage.$lookup).toHaveProperty('foreignField', 'eventId');
    expect(participantsStage.$lookup).toHaveProperty('as', 'participants');
  });

  it('should contain the participants users lookup stage with pipeline optimization', () => {
    const lookupStages = createEventLookupStages();
    const participantsUsersStage = lookupStages[6] as PipelineStage.Lookup;

    expect(participantsUsersStage).toHaveProperty('$lookup');
    expect(participantsUsersStage.$lookup).toHaveProperty('from', 'users');
    expect(participantsUsersStage.$lookup).toHaveProperty('let');
    expect(participantsUsersStage.$lookup).toHaveProperty('pipeline');
    expect(participantsUsersStage.$lookup).toHaveProperty('as', 'participantsUsersMap');
    
    // Verify the pipeline uses $in for efficient filtering
    const pipeline = participantsUsersStage.$lookup.pipeline as any[];
    expect(pipeline).toBeDefined();
    expect(pipeline.length).toBeGreaterThan(0);
    expect(pipeline[0]).toHaveProperty('$match');
  });
});
