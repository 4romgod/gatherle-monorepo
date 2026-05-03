import { GetRecommendedFeedQuery } from '@/data/graphql/types/graphql';

export type RecommendedFeedItem = GetRecommendedFeedQuery['readRecommendedFeed'][number];
export type RecommendedFeedEventPreview = NonNullable<RecommendedFeedItem['event']>;
export type RecommendedFeedOccurrencePreview = NonNullable<RecommendedFeedItem['representativeOccurrence']>;
