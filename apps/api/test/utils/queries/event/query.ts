export const getReadEventByIdQuery = (eventId: string) => {
    return {
        query: `query ReadEventById($eventId: String!) {
            readEventById(eventId: $eventId) {
                eventId
                slug
                title
                description
            }
        }`,
        variables: {
            eventId: eventId,
        },
    };
};

export const getReadEventBySlugQuery = (slug: string) => {
    return {
        query: `query ReadEventBySlug($slug: String!) {
            readEventBySlug(slug: $slug) {
                eventId
                slug
                title
                description
            }
        }`,
        variables: {
            slug: slug,
        },
    };
};
