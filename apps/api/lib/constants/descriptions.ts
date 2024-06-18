export const EVENT_DESCRIPTIONS = {
    RSVP: {
        USER_ID_LIST: 'A unique list (set) of user IDs, (e.g. userIdList: ["userId001", "userId254"])',
        USERNAME_LIST: 'A unique list (set) of usernames, (e.g. usernameList: ["allmight001", "jack254"])',
        EMAIL_LIST: 'A unique list (set) of emails, (e.g. emailList: ["allmight001@email.com", "jack254@email.com"])',
    },
    EVENT: {
        TYPE: 'Represents an event with details such as title, description, location, and associated metadata.',
        MEDIA_TYPE: 'Represents media associated with an event, including a featured image URL and additional media data in JSON format.',
        CREATE_INPUT: 'Input type for creating a new event, including details such as title, description, dates, location, and additional metadata.',
        UPDATE_INPUT:
            'Input type for updating an existing event, allowing modification of details such as title, description, dates, location, and additional metadata.',
        ID: "Unique identifier for the event (e.g., 'event123')",
        SLUG: "Slug for the event URL (e.g., 'annual-meetup-2023')",
        TITLE: "Title of the event (e.g., 'Annual Meetup 2023')",
        DESCRIPTION: "Description of the event (e.g., 'Join us for our annual meetup!')",
        START_DATE_TIME: "Start date and time of the event in ISO 8601 format (e.g., '2023-09-15T09:00:00Z')",
        END_DATE_TIME: "End date and time of the event in ISO 8601 format (e.g., '2023-09-15T17:00:00Z')",
        RECURRENCE_RULE: "Recurrence rule for repeating events in iCalendar format (optional) (e.g., 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR')",
        LOCATION: "Location of the event (e.g., '123 Main St, Springfield, IL')",
        STATUS: "Status of the event ('Cancelled', 'Completed', 'Ongoing', 'Upcoming')",
        CAPACITY: 'Maximum capacity of attendees for the event (e.g, 500)',
        EVENT_CATEGORY_LIST: 'List of categories associated with the event',
        ORGANIZER_LIST: 'List of organizers (users) for the event',
        RSVP_LIST: "List of users who have RSVP'd to the event",
        RSVP_INPUT_TYPE: 'Input type for managing event RSVPs, including a list of user IDs who are responding to the event invitation.',
        TAGS: 'Additional tags or metadata associated with the event',
        MEDIA: 'Media associated with the event, such as images or videos',
        FEATURED_IMAGE: 'URL of the featured image for the event.',
        OTHER_MEDIA_DATA: 'Additional media data in JSON format, such as links to videos or galleries.',
        ADDITIONAL_DETAILS: 'Additional details or information related to the event',
        COMMENTS: 'Comments or discussions related to the event',
        PRIVACY_SETTING: "Privacy setting for the event ('Public', 'Private', 'Invitation')",
        EVENT_LINK: 'Link or URL associated with the event',
    },
};

export const EVENT_CATEGORY_DESCRIPTIONS = {
    TYPE: 'Represents a category of events with attributes such as name, icon, and description.',
    CREATE_INPUT: 'Input type for creating a new category of events with attributes like name, icon, and description.',
    UPDATE_INPUT: 'Input type for updating an existing category of events with attributes like name, icon, and description.',
    ID: "Unique identifier for the event category (e.g., 'category123')",
    SLUG: "Slug for the event category URL (e.g., 'music-festivals')",
    NAME: "Name of the event category (e.g., 'Music Festivals')",
    ICON_NAME: "Name of the icon representing the event category (e.g., 'music_note')",
    DESCRIPTION: "Description of the event category (e.g., 'Events featuring live music performances')",
    COLOR: "Color associated with the event category (optional) (e.g., '#FF5733')",
};

export const USER_DESCRIPTIONS = {
    TYPE: 'Represents a user with personal details and roles within the system.',
    WITH_TOKEN: 'Represents a user along with an authentication token, including user details and the token string.',
    CREATE_INPUT: 'Input type for creating a new user with personal details and roles within the system.',
    UPDATE_INPUT: 'Input type for updating an existing user with personal details and roles within the system.',
    LOGIN_INPUT: 'Input type for user login, including fields for email and password.',
    ID: "Unique identifier for the user (e.g., '123e4567-e89b-12d3-a456-426614174000')",
    ADDRESS: "User's residential address, (e.g., '123 Main St, Springfield, IL')",
    BIRTHDATE: "User's birth date in YYYY-MM-DD format, (e.g. '2002-05-01')",
    EMAIL: "User's email address (e.g., 'user@example.com')",
    ENCRYPTED_PASSWORD: "User's password stored in encrypted form (e.g., '$2b$10$EixZaYVK1fsbw1ZfbX3OXe')",
    FAMILY_NAME: "User's family (last) name (e.g., 'Roronoa')",
    GENDER: "The Gender of the user, (e.g., 'Male', 'Female', 'Other')",
    GIVEN_NAME: "User's given (first) name (e.g., 'Zoro')",
    PASSWORD: "User's password in plain text (e.g., 12345678)",
    PHONE_NUMBER: "User's phone number (optional) (e.g., '+27 800 555 1234')",
    PROFILE_PICTURE: "URL to the user's profile picture (e.g., 'https://example.com/profile.jpg')",
    TOKEN: 'Authentication and Authorization JWT token',
    USER_ROLE: 'Role assigned to the user within the system, ("Admin", "User", "Host", "Guest")',
    USERNAME: "User's unique chosen or auto generated username (e.g., 'deku123')",
};

export const RESOLVER_DESCRIPTIONS = {
    EVENT: {
        createEvent: 'Create a new event. Requires input data for creating a new event and returns the created event.',
        updateEvent: 'Update an existing event. Requires input data for updating the event and returns the updated event.',
        deleteEventById: 'Delete an event by its ID. Requires the event ID and returns the deleted event or a 404 Error if not found.',
        readEventById: 'Read an event by its ID. Requires the event ID and returns the event or a 404 Error if not found.',
        readEventBySlug: 'Read an event by its slug. Requires the slug and returns the event or a 404 Error if not found.',
        readEvents: 'Read a list of events. Accepts optional query options for pagination, sorting, and filtering and returns a list of events.',
    },
    EVENT_CATEGORY: {
        createEventCategory: 'Create a new event category. Requires input data for creating a new category and returns the created category.',
        updateEventCategory: 'Update an existing event category. Requires input data for updating the category and returns the updated category.',
        deleteEventCategoryById:
            'Delete an event category by its ID. Requires the category ID and returns the deleted category or 404 Error if not found.',
        readEventCategoryById: 'Read an event category by its ID. Requires the category ID and returns the category or 404 Error if not found.',
        readEventCategoryBySlug: 'Read an event category by its slug. Requires the slug and returns the category or 404 Error if not found.',
        readEventCategories:
            'Read a list of event categories. Accepts optional query options for pagination and filtering and returns a list of categories.',
    },
    USER: {
        createUser: 'Create a new user. Requires input data for creating a new user and returns the created user along with an authentication token.',
        loginUser: 'Log in a user. Requires input data for logging in and returns the user along with an authentication token.',
        updateUser: 'Update an existing user. Requires input data for updating the user and returns the updated user.',
        deleteUserById: 'Delete a user by their ID. Requires the user ID and returns the deleted user or 404 Error if not found.',
        readUserById: 'Read a user by their ID. Requires the user ID and returns the user or 404 Error if not found.',
        readUserByUsername: 'Read a user by their username. Requires the username and returns the user or 404 Error if not found.',
        readUserByEmail: 'Read a user by their email. Requires the email and returns the user or 404 Error if not found.',
        readUsers: 'Read a list of users. Accepts optional query options for pagination and filtering and returns a list of users.',
    },
};

export const QUERY_DESCRIPTIONS = {
    QUERY: {
        INPUT: 'Options for querying a model, including pagination, sorting, and filtering',
        SORT: 'Sorting options',
        PAGINATION: 'Pagination options',
        FILTER: 'Filtering options',
    },
    SORT: {
        INPUT: 'Sorting options for ordering results',
        FIELD: 'The field to sort by',
        ORDER: 'The order to sort the results ("asc" or "desc")',
    },
    FILTER: {
        INPUT: 'Filter options for querying specific fields',
        OPERATOR: "The operator to apply ('eq', 'ne', 'gt', 'lt', 'gte', 'lte')",
        SELECTOR_OPERATOR: "The selector operator to apply ('and', 'nor', 'or', 'search', 'caseSensitive')",
        FIELD: 'The field to filter by',
        VALUE: 'The value to filter by, (e.g. {"field": "name", "value": "Midoriya"})',
    },
    PAGINATION: {
        INPUT: 'Pagination options for limiting and skipping results',
        LIMIT: 'The number of results to return',
        SKIP: 'The number of results to skip',
    },
};

export const COMMON_DESCRIPTIONS = {
    ID: 'A unique identifier',
    TYPE_ANY: 'Type can be anything, (string, number, boolean, etc.)',
};
