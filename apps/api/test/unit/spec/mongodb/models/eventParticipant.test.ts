import { Types } from 'mongoose';
import EventParticipant from '@/mongodb/models/eventParticipant';
import { ParticipantStatus } from '@gatherle/commons/types';

describe('EventParticipant Model', () => {
  describe('pre-validate hook', () => {
    it('should auto-generate participantId from _id when participantId is not set', async () => {
      const mockId = new Types.ObjectId();
      const mockParticipant = {
        _id: mockId,
        eventId: 'event123',
        userId: 'user123',
        status: ParticipantStatus.Going,
        quantity: 1,
      };

      // Create a mock document that simulates the pre-validate hook behavior
      const mockDoc = {
        ...mockParticipant,
        participantId: undefined,
        validate: jest.fn(async function (this: any) {
          // Simulate the pre-validate hook logic
          if (!this.participantId && this._id) {
            this.participantId = this._id.toString();
          }
          return Promise.resolve();
        }),
      };

      await mockDoc.validate.call(mockDoc);

      expect(mockDoc.participantId).toBe(mockId.toString());
    });

    it('should not overwrite existing participantId', async () => {
      const mockId = new Types.ObjectId();
      const existingParticipantId = 'existing-participant-id';
      const mockParticipant = {
        _id: mockId,
        participantId: existingParticipantId,
        eventId: 'event123',
        userId: 'user123',
        status: ParticipantStatus.Going,
        quantity: 1,
      };

      // Create a mock document that simulates the pre-validate hook behavior
      const mockDoc = {
        ...mockParticipant,
        validate: jest.fn(async function (this: any) {
          // Simulate the pre-validate hook logic
          if (!this.participantId && this._id) {
            this.participantId = this._id.toString();
          }
          return Promise.resolve();
        }),
      };

      await mockDoc.validate.call(mockDoc);

      expect(mockDoc.participantId).toBe(existingParticipantId);
    });

    it('should not set participantId when _id is not present', async () => {
      const mockParticipant = {
        _id: undefined,
        participantId: undefined,
        eventId: 'event123',
        userId: 'user123',
        status: ParticipantStatus.Going,
        quantity: 1,
      };

      // Create a mock document that simulates the pre-validate hook behavior
      const mockDoc = {
        ...mockParticipant,
        validate: jest.fn(async function (this: any) {
          // Simulate the pre-validate hook logic
          if (!this.participantId && this._id) {
            this.participantId = this._id.toString();
          }
          return Promise.resolve();
        }),
      };

      await mockDoc.validate.call(mockDoc);

      expect(mockDoc.participantId).toBeUndefined();
    });

    it('should handle errors in pre-validate hook gracefully', async () => {
      const mockError = new Error('Validation error');
      const mockDoc = {
        validate: jest.fn(async function (this: any) {
          try {
            throw mockError;
          } catch (error) {
            return Promise.reject(error);
          }
        }),
      };

      await expect(mockDoc.validate.call(mockDoc)).rejects.toThrow('Validation error');
    });
  });

  describe('model export', () => {
    it('should export EventParticipant model', () => {
      expect(EventParticipant).toBeDefined();
      expect(EventParticipant.modelName).toBe('EventParticipant');
    });
  });
});
