import type { PipelineStage } from 'mongoose';
import { FollowApprovalStatus, FollowTargetType } from '@gatherle/commons/types';

export const createEventLookupStages = (options?: { skipCounts?: boolean }): PipelineStage[] => {
  const skipCounts = options?.skipCounts ?? false;

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
    ...(skipCounts
      ? []
      : [
          {
            $lookup: {
              from: 'follows',
              let: { eventId: '$eventId' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$targetType', FollowTargetType.EventSeries] },
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
          } as PipelineStage,
          {
            $addFields: {
              savedByCount: {
                $ifNull: [{ $arrayElemAt: ['$savedByCountAggregation.count', 0] }, 0],
              },
            },
          } as PipelineStage,
        ]),
    {
      $project: {
        savedByCountAggregation: 0,
      },
    },
  ];
};
