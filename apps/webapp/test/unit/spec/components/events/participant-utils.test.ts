import { ParticipantStatus } from '@/data/graphql/types/graphql';
import {
  buildAttendanceBadgeLabel,
  buildAttendeeSummaryLabel,
  buildParticipantSocialProof,
  formatGoingCountLabel,
  formatInterestedCountLabel,
  getParticipantStatusCounts,
} from '@/components/events/participant-utils';

describe('participant-utils social proof', () => {
  const participants = [
    {
      participantId: 'participant-1',
      userId: 'user-1',
      status: ParticipantStatus.Going,
      quantity: 1,
      user: {
        userId: 'user-1',
        username: 'ada',
        given_name: 'Ada',
        family_name: 'Lovelace',
      },
    },
    {
      participantId: 'participant-2',
      userId: 'user-2',
      status: ParticipantStatus.Going,
      quantity: 2,
      user: {
        userId: 'user-2',
        username: 'grace',
        given_name: 'Grace',
        family_name: 'Hopper',
      },
    },
    {
      participantId: 'participant-3',
      userId: 'user-3',
      status: ParticipantStatus.Interested,
      quantity: 1,
      user: {
        userId: 'user-3',
        username: 'katherine',
        given_name: 'Katherine',
        family_name: 'Johnson',
      },
    },
    {
      participantId: 'participant-4',
      userId: 'user-4',
      status: ParticipantStatus.Cancelled,
      quantity: 1,
      user: {
        userId: 'user-4',
        username: 'cancelled',
      },
    },
  ] as any[];

  it('summarises participant status counts while ignoring cancelled RSVPs', () => {
    expect(getParticipantStatusCounts(participants as any)).toEqual({
      going: 3,
      interested: 1,
      total: 4,
    });
  });

  it('formats natural attendance copy', () => {
    expect(formatGoingCountLabel(1, { includePeopleWord: true })).toBe('1 person going');
    expect(formatGoingCountLabel(4)).toBe('4 going');
    expect(formatInterestedCountLabel(2, { includePeopleWord: true })).toBe('2 people interested');
    expect(formatInterestedCountLabel(0)).toBe('No one interested yet');
    expect(buildAttendanceBadgeLabel(3, 0)).toBe('3 going');
    expect(buildAttendanceBadgeLabel(0, 2)).toBe('2 interested');
    expect(buildAttendanceBadgeLabel(3, 2)).toBe('3 going · 2 interested');
    expect(buildAttendanceBadgeLabel(0, 0)).toBeNull();
    expect(buildAttendeeSummaryLabel('2 interested', 2)).toBe('2 interested');
    expect(buildAttendeeSummaryLabel(null, 1)).toBe('1 attendee');
    expect(buildAttendeeSummaryLabel(null, 4)).toBe('4 attendees');
    expect(buildAttendeeSummaryLabel(null, 0)).toBe('Be the first to go');
  });

  it('builds people-first social proof with followed users first', () => {
    expect(buildParticipantSocialProof(participants as any)).toMatchObject({
      text: 'Ada and 2 others are going',
    });

    expect(
      buildParticipantSocialProof(participants as any, {
        followingUserIds: new Set(['user-3']),
      }),
    ).toMatchObject({
      text: 'Katherine is interested',
    });

    expect(buildParticipantSocialProof([], { counts: { totalCount: 0 } })).toMatchObject({
      text: 'Be the first to go',
    });
  });
});
