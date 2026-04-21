import { Types } from 'mongoose';
import EventMoment from '@/mongodb/models/eventMoment';
import { EventMomentState, EventMomentType } from '@gatherle/commons/types';

describe('EventMoment Model', () => {
  describe('pre-validate hook', () => {
    it('derives momentId from _id when momentId is not set', async () => {
      const _id = new Types.ObjectId();
      const doc = new EventMoment({
        _id,
        eventId: new Types.ObjectId().toString(),
        authorId: new Types.ObjectId().toString(),
        type: EventMomentType.Text,
        caption: 'hello',
        state: EventMomentState.Ready,
        isPublished: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      await doc.validate();

      expect(doc.momentId).toBe(_id.toString());
    });

    it('does not overwrite an existing momentId', async () => {
      const doc = new EventMoment({
        momentId: 'existing-moment-id',
        eventId: new Types.ObjectId().toString(),
        authorId: new Types.ObjectId().toString(),
        type: EventMomentType.Video,
        state: EventMomentState.UploadPending,
        rawS3Key: 'event-moments/event/user/clip.mp4',
        mediaUrl: 'https://cdn.example.com/event-moments/event/user/clip.mp4',
        isPublished: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      await doc.validate();

      expect(doc.momentId).toBe('existing-moment-id');
    });
  });

  describe('model export', () => {
    it('exports the EventMoment model', () => {
      expect(EventMoment).toBeDefined();
      expect(EventMoment.modelName).toBe('EventMoment');
    });
  });
});
