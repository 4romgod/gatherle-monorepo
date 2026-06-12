import {
  CreateSupportRequestInputSchema,
  ReadSupportRequestsInputSchema,
  UpdateSupportRequestStatusInputSchema,
} from '@/validation';
import { SUPPORT_REQUEST_LIMITS } from '@gatherle/commons/server/constants';
import { SupportRequestKind } from '@gatherle/commons/server/types';
import mongoose from 'mongoose';

describe('CreateSupportRequestInputSchema', () => {
  it('validates a complete support request payload', () => {
    const result = CreateSupportRequestInputSchema.safeParse({
      kind: SupportRequestKind.Bug,
      message: 'The settings page saves but the toast never appears afterward.',
      pagePath: '/account/support',
      screenshotUrl: 'https://cdn.example.com/support-requests/example/attachment.png',
      subject: 'Settings save feedback missing',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a subject that is too short', () => {
    const result = CreateSupportRequestInputSchema.safeParse({
      kind: SupportRequestKind.Help,
      message: 'I need help figuring out why notifications are delayed.',
      subject: 'Hi',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toBe('Subject must be at least 3 characters long.');
    }
  });

  it('rejects an invalid screenshot URL', () => {
    const result = CreateSupportRequestInputSchema.safeParse({
      kind: SupportRequestKind.Idea,
      message: 'A way to contact the team directly from account would be useful.',
      screenshotUrl: 'not-a-url',
      subject: 'Support entry point',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toBe('Screenshot URL must be a valid URL.');
    }
  });

  it('rejects a subject that is too long', () => {
    const result = CreateSupportRequestInputSchema.safeParse({
      kind: SupportRequestKind.Help,
      message: 'I need help figuring out why notifications are delayed.',
      subject: 'a'.repeat(SUPPORT_REQUEST_LIMITS.subjectMaxLength + 1),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toBe(
        `Subject must be ${SUPPORT_REQUEST_LIMITS.subjectMaxLength} characters or fewer.`,
      );
    }
  });

  it('rejects a message that is too long', () => {
    const result = CreateSupportRequestInputSchema.safeParse({
      kind: SupportRequestKind.Help,
      message: 'a'.repeat(SUPPORT_REQUEST_LIMITS.messageMaxLength + 1),
      subject: 'Need help with alerts',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toBe(
        `Message must be ${SUPPORT_REQUEST_LIMITS.messageMaxLength} characters or fewer.`,
      );
    }
  });
});

describe('ReadSupportRequestsInputSchema', () => {
  it('validates admin query filters', () => {
    const result = ReadSupportRequestsInputSchema.safeParse({
      limit: 50,
      search: 'alerts',
    });

    expect(result.success).toBe(true);
  });
});

describe('UpdateSupportRequestStatusInputSchema', () => {
  it('validates a status update payload', () => {
    const result = UpdateSupportRequestStatusInputSchema.safeParse({
      supportRequestId: new mongoose.Types.ObjectId().toString(),
      status: 'Resolved',
    });

    expect(result.success).toBe(true);
  });
});
