export const getReadRecommendedFeedQuery = (limit?: number, skip?: number) => {
  return {
    query: `
      query ReadRecommendedFeed($limit: Int, $skip: Int) {
        readRecommendedFeed(limit: $limit, skip: $skip) {
          feedItemId
          eventId
          score
          reasons
          computedAt
          event {
            eventId
            title
          }
        }
      }
    `,
    variables: {
      limit,
      skip,
    },
  };
};
