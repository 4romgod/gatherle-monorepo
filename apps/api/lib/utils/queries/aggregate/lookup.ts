import type { PipelineStage } from 'mongoose';
import { FollowApprovalStatus, FollowTargetType, ParticipantStatus } from '@gatherle/commons/types';

export const createEventLookupStages = (): PipelineStage[] => {
  const rsvpStatusesForCount = [ParticipantStatus.Going, ParticipantStatus.Interested];

  return [
    {
      $lookup: {
        from: 'eventcategories',
        localField: 'eventCategories',
        foreignField: 'eventCategoryId',
        as: 'eventCategories',
      },
    },
    {
      $lookup: {
        from: 'users',
        let: { organizerUserIds: '$organizers.user' },
        pipeline: [
          {
            $match: {
              $expr: { $in: ['$userId', '$$organizerUserIds'] },
            },
          },
        ],
        as: 'organizersUsersMap',
      },
    },
    {
      $addFields: {
        // Create a map for O(1) lookup instead of O(n) filtering
        organizersUserMap: {
          $arrayToObject: {
            $map: {
              input: '$organizersUsersMap',
              as: 'user',
              in: { k: '$$user.userId', v: '$$user' },
            },
          },
        },
      },
    },
    {
      $addFields: {
        organizers: {
          $filter: {
            input: {
              $map: {
                input: '$organizers',
                as: 'organizer',
                in: {
                  user: {
                    $getField: {
                      field: '$$organizer.user',
                      input: '$organizersUserMap',
                    },
                  },
                  role: '$$organizer.role',
                },
              },
            },
            as: 'organizer',
            cond: { $ne: ['$$organizer.user', null] },
          },
        },
      },
    },
    {
      $project: {
        organizersUsersMap: 0,
        organizersUserMap: 0,
      },
    },
    // Lookup participants from EventParticipant collection
    {
      $lookup: {
        from: 'eventparticipants',
        localField: 'eventId',
        foreignField: 'eventId',
        as: 'participants',
      },
    },
    // Lookup users for participants
    {
      $lookup: {
        from: 'users',
        let: { participantUserIds: '$participants.userId' },
        pipeline: [
          {
            $match: {
              $expr: { $in: ['$userId', '$$participantUserIds'] },
            },
          },
        ],
        as: 'participantsUsersMap',
      },
    },
    {
      $addFields: {
        // Create a map for O(1) lookup of user data
        participantsUserMap: {
          $arrayToObject: {
            $map: {
              input: '$participantsUsersMap',
              as: 'user',
              in: { k: '$$user.userId', v: '$$user' },
            },
          },
        },
      },
    },
    {
      $addFields: {
        // Enrich each participant with their user data
        participants: {
          $map: {
            input: '$participants',
            as: 'participant',
            in: {
              participantId: '$$participant.participantId',
              eventId: '$$participant.eventId',
              userId: '$$participant.userId',
              status: '$$participant.status',
              quantity: '$$participant.quantity',
              invitedBy: '$$participant.invitedBy',
              sharedVisibility: '$$participant.sharedVisibility',
              rsvpAt: '$$participant.rsvpAt',
              cancelledAt: '$$participant.cancelledAt',
              checkedInAt: '$$participant.checkedInAt',
              createdAt: '$$participant.createdAt',
              updatedAt: '$$participant.updatedAt',
              user: {
                $getField: {
                  field: '$$participant.userId',
                  input: '$participantsUserMap',
                },
              },
            },
          },
        },
      },
    },
    {
      $lookup: {
        from: 'follows',
        let: { eventId: '$eventId' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$targetType', FollowTargetType.Event] },
                  { $eq: ['$targetId', '$$eventId'] },
                  { $eq: ['$approvalStatus', FollowApprovalStatus.Accepted] },
                ],
              },
            },
          },
          { $count: 'count' },
        ],
        as: 'savedByCountAggregation',
      },
    },
    {
      $addFields: {
        rsvpCount: {
          $size: {
            $filter: {
              input: { $ifNull: ['$participants', []] },
              as: 'participant',
              cond: { $in: ['$$participant.status', rsvpStatusesForCount] },
            },
          },
        },
        savedByCount: {
          $ifNull: [{ $arrayElemAt: ['$savedByCountAggregation.count', 0] }, 0],
        },
      },
    },
    {
      $project: {
        participantsUsersMap: 0,
        participantsUserMap: 0,
        savedByCountAggregation: 0,
      },
    },
  ];
};
