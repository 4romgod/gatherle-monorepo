export const getCreateEventMutation = (event: any) => {
    return {
        query: `mutation CreateEvent($input: CreateEventInputType!) {
            createEvent(input: $input) {
              id
              slug
              title
              description
              organizerList {
                id
                given_name
                username
              }
              eventCategoryList {
                id
                slug
                name
              }
            }
        }`,
        variables: {
            input: event,
        },
    };
};
