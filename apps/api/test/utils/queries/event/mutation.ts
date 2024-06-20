export const getCreateEventMutation = (event: any) => {
    return {
        query: `mutation CreateEvent($input: CreateEventInputType!) {
            createEvent(input: $input) {
              eventId
              slug
              title
              description
              organizerList {
                userId
                given_name
                username
              }
              eventCategoryList {
                eventCategoryId
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
