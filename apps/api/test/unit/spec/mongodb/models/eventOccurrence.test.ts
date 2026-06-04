import EventOccurrence from '@/mongodb/models/eventOccurrence';
import { EventOccurrenceStatus } from '@gatherle/commons/server/types';

describe('EventOccurrence Model', () => {
  describe('validation', () => {
    it('validates when occurrenceId is explicitly provided', async () => {
      const doc = new EventOccurrence({
        occurrenceId: 'series-1#2026-05-06T16:00:00.000Z',
        eventSeriesId: 'series-1',
        occurrenceKey: 'series-1#2026-05-06T16:00:00.000Z',
        originalStartAt: new Date('2026-05-06T16:00:00.000Z'),
        startAt: new Date('2026-05-06T16:00:00.000Z'),
        endAt: new Date('2026-05-06T19:00:00.000Z'),
        timezone: 'Africa/Johannesburg',
        status: EventOccurrenceStatus.Scheduled,
        isException: false,
        seriesScheduleVersion: 1,
      });

      await doc.validate();

      expect(doc.occurrenceId).toBe('series-1#2026-05-06T16:00:00.000Z');
    });
  });

  describe('model export', () => {
    it('exports the EventOccurrence model', () => {
      expect(EventOccurrence).toBeDefined();
      expect(EventOccurrence.modelName).toBe('EventOccurrence');
    });
  });
});
