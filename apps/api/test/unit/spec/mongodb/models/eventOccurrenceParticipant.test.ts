import EventOccurrenceParticipant from '@/mongodb/models/eventOccurrenceParticipant';
import { ParticipantStatus } from '@gatherle/commons/server/types';

describe('EventOccurrenceParticipant Model', () => {
  describe('validation', () => {
    it('derives participantId from the document _id during validation', async () => {
      const doc = new EventOccurrenceParticipant({
        occurrenceId: 'series-1#2026-05-06T16:00:00.000Z',
        userId: 'user-1',
        status: ParticipantStatus.Going,
        quantity: 1,
      });

      await doc.validate();

      expect(doc.participantId).toBeDefined();
      expect(typeof doc.participantId).toBe('string');
    });
  });

  describe('model export', () => {
    it('exports the EventOccurrenceParticipant model', () => {
      expect(EventOccurrenceParticipant).toBeDefined();
      expect(EventOccurrenceParticipant.modelName).toBe('EventOccurrenceParticipant');
    });
  });
});
