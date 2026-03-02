export const getRefreshFeedMutation = () => {
  return {
    query: `
      mutation RefreshFeed {
        refreshFeed
      }
    `,
  };
};
