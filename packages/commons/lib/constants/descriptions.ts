export const EVENT_DESCRIPTIONS = {
  RSVP: {
    USER_ID_LIST: 'A unique list (set) of user IDs, (e.g. userIdList: ["userId001", "userId254"])',
    USERNAME_LIST: 'A unique list (set) of usernames, (e.g. usernameList: ["allmight001", "jack254"])',
    EMAIL_LIST: 'A unique list (set) of emails, (e.g. emailList: ["allmight001@email.com", "jack254@email.com"])',
  },
  PARTICIPANT: {
    STATUS_ENUM: 'Lifecycle status of an RSVP or attendance record.',
    VISIBILITY_ENUM: 'Controls how widely a participant wants their RSVP activity to be shared.',
    SERIES_TYPE: 'Represents a participant record attached directly to an event series.',
    OCCURRENCE_TYPE: 'Represents a participant record attached to a concrete event occurrence.',
    UPSERT_SERIES_INPUT: 'Input for creating or updating a series-level RSVP.',
    CANCEL_SERIES_INPUT: 'Input for cancelling a series-level RSVP.',
    UPSERT_OCCURRENCE_INPUT: 'Input for creating or updating an occurrence-level RSVP for the authenticated user.',
    CANCEL_OCCURRENCE_INPUT: 'Input for cancelling an occurrence-level RSVP for the authenticated user.',
    ID: 'Unique identifier for the participant record.',
    EVENT_SERIES_ID: 'Identifier of the parent event series associated with this participant record.',
    OCCURRENCE_ID: 'Identifier of the concrete occurrence associated with this participant record.',
    USER_ID: 'Identifier of the user who owns this RSVP or attendance record.',
    STATUS: 'Current RSVP or attendance status for the participant.',
    QUANTITY: 'Number of reserved spots represented by this participant record, including the attendee.',
    INVITED_BY: 'Optional user identifier for the inviter that created or influenced this RSVP.',
    SHARED_VISIBILITY: 'Visibility preference for sharing the RSVP with other users.',
    RSVP_AT: 'Timestamp when the RSVP was first created or last reactivated.',
    CANCELLED_AT: 'Timestamp when this RSVP was cancelled.',
    CHECKED_IN_AT: 'Timestamp when this participant was checked in at the event.',
    EVENT_SERIES: 'Parent event series associated with this participant record.',
    EVENT_OCCURRENCE: 'Concrete occurrence associated with this participant record.',
    USER: 'User that owns this RSVP or attendance record.',
  },
  EVENT: {
    TYPE: 'Represents an event with details such as title, description, location, and associated metadata.',
    SCHEDULE_TYPE:
      'Defines the occurrence template for an event series, including the anchor start time, occurrence duration, timezone, and recurrence rule.',
    ORGANIZER_TYPE: 'Represents an organizer entry for an event series, including the linked user and organizer role.',
    MEDIA_TYPE:
      'Represents media associated with an event, including a featured image URL and additional media data in JSON format.',
    CREATE_INPUT:
      'Input type for creating a new event, including details such as title, description, dates, location, and additional metadata.',
    UPDATE_INPUT:
      'Input type for updating an existing event, allowing modification of details such as title, description, dates, location, and additional metadata.',
    SPLIT_INPUT:
      'Input type for splitting a recurring event series at one occurrence boundary and creating a successor series for that occurrence and all following ones.',
    ID: "Unique identifier for the event (e.g., 'event123')",
    SLUG: "Slug for the event URL (e.g., 'annual-meetup-2023')",
    TITLE: "Title of the event (e.g., 'Annual Meetup 2023')",
    SUMMARY: 'Short summary for event listings and previews.',
    DESCRIPTION: "Description of the event (e.g., 'Join us for our annual meetup!')",
    START_DATE_TIME: "Start date and time of the event in ISO 8601 format (e.g., '2023-09-15T09:00:00Z')",
    END_DATE_TIME: 'End date and time of each occurrence in ISO 8601 format (optional).',
    ANCHOR_START_AT:
      "Start date and time of the first occurrence anchor in ISO 8601 format (e.g., '2023-09-15T09:00:00Z').",
    OCCURRENCE_DURATION_MINUTES:
      'Duration of one generated occurrence in minutes. A value of 0 means the occurrence has no explicit end time.',
    RECURRENCE_RULE:
      "Recurrence rule for repeating events using RRULE fields only, without DTSTART (e.g., 'FREQ=WEEKLY;BYDAY=MO,WE,FR').",
    TIMEZONE: 'IANA timezone identifier used to interpret the schedule (e.g., Africa/Johannesburg).',
    PRIMARY_SCHEDULE:
      'Primary schedule containing anchorStartAt, occurrenceDurationMinutes, timezone, and recurrenceRule.',
    LOCATION: "Location of the event (e.g., '123 Main St, Springfield, IL')",
    LOCATION_SNAPSHOT: 'Snapshot of the event location used for history and display consistency.',
    VENUE_ID: 'Reference to the venue associated with the event when available.',
    ORGANIZER_USER: 'User reference for an event organizer.',
    ORGANIZER_ROLE: 'Role assigned to the organizer within the event series.',
    STATUS: "Status of the event ('Cancelled', 'Completed', 'Ongoing', 'Upcoming')",
    VISIBILITY: 'Visibility controls for event discovery and access.',
    LIFECYCLE_STATUS: 'Lifecycle status used for event publishing and completion workflows.',
    CAPACITY: 'Maximum capacity of attendees for the event (e.g, 500)',
    RSVP_LIMIT: 'Optional RSVP or participant limit for the event.',
    WAITLIST_ENABLED: 'Whether the waitlist is enabled once RSVP capacity is reached.',
    ALLOW_GUEST_PLUS_ONES: 'Whether attendees can bring guest plus-ones.',
    REMINDERS_ENABLED: 'Whether attendee reminders are enabled for the event.',
    SHOW_ATTENDEES: 'Whether the attendee list is visible to viewers.',
    EVENT_CATEGORY_LIST: 'List of categories associated with the event',
    ORGANIZER_LIST: 'List of organizers (users) for the event',
    RSVP_LIST: "List of users who have RSVP'd to the event",
    RSVP_INPUT_TYPE:
      'Input type for managing event RSVPs, including a list of user IDs who are responding to the event invitation.',
    TAGS: 'Additional tags or metadata associated with the event',
    MEDIA: 'Media associated with the event, such as images or videos',
    FEATURED_IMAGE: 'URL of the featured image for the event.',
    OTHER_MEDIA_DATA: 'Additional media data in JSON format, such as links to videos or galleries.',
    ADDITIONAL_DETAILS: 'Any additional details about the event.',
    COMMENTS: 'Comments or discussions related to the event.',
    PRIVACY_SETTING: "Privacy setting for the event ('Public', 'Private', 'Invitation')",
    EVENT_LINK: 'Link or URL associated with the event',
    ORGANIZATION_ID: 'Organization that owns the event.',
    ORGANIZATION: 'Organization that owns this event (resolved via field resolver).',
    SPLIT_FROM_EVENT_SERIES_ID:
      'Identifier of the predecessor event series when this series was created by splitting a recurring series.',
    SPLIT_INTO_EVENT_SERIES_ID:
      'Identifier of the successor event series created from this series by a split at one occurrence boundary.',
    SPLIT_OCCURRENCE_ID:
      'Identifier of the occurrence boundary where the recurring series should be split into past and future series.',
    PARTICIPANTS:
      'Resolved participants for this event series, projected from the representative persisted occurrence.',
    REPRESENTATIVE_OCCURRENCE:
      'Resolved representative occurrence for this event series, used to power occurrence-aware discovery and preview surfaces.',
    UPCOMING_OCCURRENCES:
      'Upcoming concrete occurrences for this event series, sourced from persisted occurrence rows.',
    SAVED_BY_COUNT: 'Number of users who have saved the event, computed from follows.',
    RSVP_COUNT:
      'Total active RSVP/check-in quantity for this event, including guest spots represented by participant quantity.',
  },
  OCCURRENCE: {
    TYPE: 'Represents a concrete scheduled occurrence generated from an EventSeries.',
    STATUS_ENUM: 'Lifecycle status of a concrete event occurrence.',
    UPDATE_INPUT: 'Input for editing one concrete recurring occurrence without changing the rest of the series.',
    CANCEL_INPUT: 'Input for cancelling one concrete recurring occurrence without changing the rest of the series.',
    ID: 'Unique identifier for the occurrence.',
    EVENT_SERIES_ID: 'Identifier of the parent event series that owns this occurrence.',
    OCCURRENCE_KEY: 'Stable regeneration key used to idempotently identify this occurrence slot.',
    ORIGINAL_START_AT: 'Schedule-generated original start time for this occurrence slot.',
    START_AT: 'Current actual start time of this occurrence.',
    END_AT: 'Current actual end time of this occurrence.',
    TIMEZONE: 'IANA timezone identifier used for this occurrence.',
    STATUS: 'Lifecycle status of this occurrence.',
    IS_EXCEPTION: 'Whether this occurrence diverges from the generated default for the series.',
    SERIES_SCHEDULE_VERSION: 'Schedule version from the parent event series that produced this occurrence.',
    EVENT_SERIES: 'Parent event series that owns this occurrence.',
    PARTICIPANTS: 'Participants attached to this concrete occurrence.',
    RSVP_COUNT:
      'Total active RSVP/check-in quantity for this occurrence, including guest spots represented by participant quantity.',
    MY_RSVP: "Current authenticated user's RSVP for this occurrence, if one exists.",
    CREATED_AT: 'Timestamp when the occurrence was created.',
    UPDATED_AT: 'Timestamp when the occurrence was last updated.',
  },
};

export const EVENT_MOMENT_DESCRIPTIONS = {
  TYPE: 'Represents an ephemeral moment post linked to an event occurrence and automatically expires after 24 hours.',
  PAGE_TYPE: 'Paginated list of event moments.',
  CREATE_INPUT: 'Input for creating an event moment or publishing a reserved video upload.',
  TYPE_ENUM: 'The media type of an event moment post.',
  STATE_ENUM: 'Lifecycle state of an event moment, especially for video uploads and transcoding.',
  ID: 'Unique identifier for the event moment.',
  EVENT_ID: 'Identifier of the parent event series associated with this moment.',
  OCCURRENCE_ID: 'Identifier of the concrete occurrence this moment belongs to.',
  AUTHOR_ID: 'Identifier of the user that created this moment.',
  MOMENT_TYPE: 'Media type for this moment entry.',
  CAPTION: 'Text body for text moments, or an optional caption for image and video moments.',
  MEDIA_URL: 'CloudFront URL for the uploaded media or HLS playback URL for video moments.',
  THUMBNAIL_URL: 'CloudFront URL for the video poster frame when available.',
  BACKGROUND: 'Background colour token for text moments.',
  STATE: 'Current lifecycle state of this moment.',
  IS_PUBLISHED: 'Whether this moment is visible to readers.',
  DURATION_SECONDS: 'Duration in seconds for video moments when available.',
  EXPIRES_AT: 'Timestamp when this moment expires and is automatically deleted.',
  CREATED_AT: 'Timestamp when this moment was created.',
  AUTHOR: 'Author of this event moment.',
  EVENT: 'Parent event series associated with this moment.',
  OCCURRENCE: 'Concrete event occurrence associated with this moment.',
  ITEMS: 'Page of event moments returned for the query.',
  NEXT_CURSOR: 'Cursor for fetching the next page of event moments.',
  HAS_MORE: 'Whether more event moments are available after this page.',
  RESERVED_MOMENT_ID: 'Reserved event moment identifier returned by getEventMomentUploadUrl for video uploads.',
  MEDIA_KEY: 'S3 object key returned by getEventMomentUploadUrl for image and video uploads.',
  THUMBNAIL_KEY: 'S3 object key for the uploaded video poster frame.',
};

export const USER_FEED_DESCRIPTIONS = {
  TYPE: 'A recommended event in the user feed, scored by the rule-based recommendation engine.',
  FEED_ITEM_ID: 'Unique identifier for this feed item.',
  EVENT_ID: 'Identifier of the recommended event series.',
  SCORE: 'Relevance score computed by the recommendation engine (higher means more relevant).',
  REASONS: 'Signals that contributed to this event being recommended.',
  COMPUTED_AT: 'Timestamp when the recommendation score was last computed.',
  EVENT: 'Resolved event series associated with this feed item.',
  REPRESENTATIVE_OCCURRENCE:
    'Resolved representative occurrence for the recommended event series, used for occurrence-aware discovery surfaces.',
};

export const LOCATION_DESCRIPTIONS = {
  LOCATION_TYPE: 'Type of location (e.g., venue, online, tba)',
  COORDINATES: 'Geographical coordinates of the venue',
  LATITUDE: 'Latitude of the venue',
  LONGITUDE: 'Longitude of the venue',
  ADDRESS: 'Address details of the venue',
  STREET: 'Street address of the venue',
  CITY: 'City of the venue',
  STATE: 'State of the venue',
  ZIP_CODE: 'ZIP code of the venue',
  COUNTRY: 'Country of the venue',
  DETAILS: 'Additional details for online or tba locations',
};

export const EVENT_CATEGORY_DESCRIPTIONS = {
  GROUP: {
    TYPE: 'Groupings of event categories',
    NAME: 'Name of the Event Category Group',
    CREATE_INPUT: 'Input type for creating a new category group',
    UPDATE_INPUT: 'Input type for creating a new category group',
  },
  TYPE: 'Represents a category of events with attributes such as name, icon, and description.',
  CREATE_INPUT: 'Input type for creating a new category of events with attributes like name, icon, and description.',
  UPDATE_INPUT:
    'Input type for updating an existing category of events with attributes like name, icon, and description.',
  ID: "Unique identifier for the event category (e.g., 'category123')",
  SLUG: "Slug for the event category URL (e.g., 'music-festivals')",
  NAME: "Name of the event category (e.g., 'Music Festivals')",
  ICON_NAME: "Name of the icon representing the event category (e.g., 'music_note')",
  DESCRIPTION: "Description of the event category (e.g., 'Events featuring live music performances')",
  COLOR: "Color associated with the event category (optional) (e.g., '#FF5733')",
  INTERESTED_USERS_COUNT: 'Number of users who have this category in their interests.',
};

export const USER_DESCRIPTIONS = {
  TYPE: 'Represents a user with personal details and the primary role within the system.',
  WITH_TOKEN: 'Represents a user along with an authentication token, including user details and the token string.',
  CREATE_INPUT: 'Input type for creating a new user with personal details and the primary role within the system.',
  UPDATE_INPUT:
    'Input type for updating an existing user with personal details and the primary role within the system.',
  LOGIN_INPUT: 'Input type for user login, including fields for email and password.',
  ID: "Unique identifier for the user (e.g., '123e4567-e89b-12d3-a456-426614174000')",
  LOCATION: "User's location with city, state, country, and optional coordinates for personalized recommendations",
  BIRTHDATE: "User's birth date in YYYY-MM-DD format, (e.g. '2002-05-01')",
  EMAIL: "User's email address (e.g., 'user@example.com')",
  ENCRYPTED_PASSWORD: "User's password stored in encrypted form (e.g., '$2b$10$EixZaYVK1fsbw1ZfbX3OXe')",
  FAMILY_NAME: "User's family (last) name (e.g., 'Roronoa')",
  GENDER: "The Gender of the user, (e.g., 'Male', 'Female', 'Other')",
  GIVEN_NAME: "User's given (first) name (e.g., 'Zoro')",
  PASSWORD: "User's password in plain text (e.g., 12345678)",
  PHONE_NUMBER: "User's phone number (optional) (e.g., '+27 800 555 1234')",
  PROFILE_PICTURE: "URL to the user's profile picture (e.g., 'https://example.com/profile.jpg')",
  BIO: 'Short biography about the user',
  SHARE_CHECKINS: 'Whether check-in activity is shared with followers by default',
  FOLLOWERS_COUNT: 'Number of accepted followers for the user.',
  TOKEN: 'Authentication and Authorization JWT token',
  USER_ROLE: 'Role assigned to the user within the system, ("Admin", "User", "Host", "Guest")',
  USERNAME: "User's unique chosen or auto generated username (e.g., 'deku123')",
  FOLLOW_POLICY:
    'Policy for accepting new followers: Public (auto-accept all) or RequireApproval (manual approval required). Default: Public',
};

export const SOCIAL_DESCRIPTIONS = {
  FOLLOW: {
    TYPE: 'Represents a follow relationship between a user and a user, organization, or event (saved event).',
    CREATE_INPUT: 'Input type for following another user, organization, or saving an event.',
    ID: 'Unique identifier for the follow relationship.',
    FOLLOWER_USER_ID: 'User who is doing the following.',
    TARGET_TYPE: 'Specifies whether the follow target is a User, Organization, or EventSeries (saved event).',
    TARGET_ID: 'ID of the user, organization, or event being followed/saved.',
    NOTIFICATION_PREFERENCES: "Nested object containing the follower's notification and feed preferences.",
    NOTIFICATION_PREFERENCES_INPUT: 'Input type for updating notification preferences.',
    CONTENT_VISIBILITY:
      "Controls whether content from this follow appears in the follower's feed (Active) or is hidden (Muted).",
    APPROVAL_STATUS:
      'The approval state of the follow request: Pending (awaiting approval), Accepted (approved), or Rejected (denied by followee).',
  },
  ACTIVITY: {
    TYPE: 'Represents an activity feed entry for personalization (follows, RSVPs, comments, etc.).',
    CREATE_INPUT: 'Input type for creating a new activity entry.',
    ACTOR_ID: 'ID of the user that performed the activity.',
    VERB: 'Action verb describing the activity (Followed, RSVPd, Commented, etc.).',
    OBJECT_TYPE: 'Type of the object affected by the activity (User, Organization, EventSeries, etc.).',
    OBJECT_ID: 'ID of the object that the activity refers to.',
    TARGET_TYPE: 'Optional type of the target item (used for organizations and events as targets).',
    TARGET_ID: 'Optional ID of the target item associated with the activity.',
    VISIBILITY: 'Visibility of the activity entry.',
    EVENT_AT: 'Timestamp when the activity occurred.',
    METADATA: 'Additional metadata that enriches the activity.',
  },
  NOTIFICATION: {
    TYPE: 'Represents a notification sent to a user about an action or event in the system.',
    TYPE_ENUM: 'Enum of all notification types (follows, events, comments, security, etc.).',
    CREATE_INPUT: 'Input type for creating a new notification.',
    ID: 'Unique identifier for the notification.',
    RECIPIENT_USER_ID: 'ID of the user who receives the notification.',
    NOTIFICATION_TYPE: 'The type/category of the notification.',
    TITLE: 'Short title summarizing the notification.',
    MESSAGE: 'Detailed message body of the notification.',
    ACTOR_USER_ID: 'ID of the user who triggered the notification (if applicable).',
    TARGET_TYPE: 'Type of the entity the notification references (User, EventSeries, Organization, Comment).',
    TARGET_ID: 'ID of the target entity the notification references.',
    OCCURRENCE_ID:
      'Optional concrete occurrence identifier associated with the notification when it targets one event session.',
    IS_READ: 'Whether the notification has been read by the recipient.',
    READ_AT: 'Timestamp when the notification was marked as read.',
    EMAIL_SENT: 'Whether an email notification was sent.',
    PUSH_SENT: 'Whether a push notification was sent.',
    ACTION_URL: 'Deep link URL for the notification action.',
    QUERIES: {
      notifications: 'Fetch paginated notifications for the authenticated user.',
      unreadNotificationCount: 'Get the count of unread notifications for the authenticated user.',
    },
    MUTATIONS: {
      markNotificationRead: 'Mark a single notification as read.',
      markAllNotificationsRead: 'Mark all notifications as read for the authenticated user.',
      deleteNotification: 'Delete a notification.',
    },
  },
};

export const NOTIFICATION_DESCRIPTIONS = SOCIAL_DESCRIPTIONS.NOTIFICATION;

export const ORGANIZATION_LINK_DESCRIPTIONS = {
  TYPE: 'Represents a short link for an organization, including a label and target URL.',
  INPUT: 'Input type for links that should be associated with an organization.',
  LABEL: 'Readable label for the link (e.g., "Website", "Instagram").',
  URL: 'Fully-qualified URL for the link target.',
};

export const ORGANIZATION_DESCRIPTIONS = {
  TYPE: 'Represents an organization that owns events, venues, and membership policies.',
  CREATE_INPUT: 'Input type for creating an organization, defining its policy defaults, owner, and optional metadata.',
  UPDATE_INPUT: 'Input type for updating an existing organization.',
  ID: "Unique identifier for the organization (e.g., 'org123')",
  SLUG: 'URL-friendly slug derived from the organization name.',
  NAME: 'Human-readable name of the organization.',
  DESCRIPTION: 'Long-form description of what the organization represents.',
  LOGO: 'URL pointing to the organization logo.',
  OWNER_ID: 'User ID that owns the organization and can grant access.',
  DEFAULT_VISIBILITY: 'Default visibility policy applied to events created by this organization.',
  BILLING_EMAIL: 'Email address used for billing or payouts.',
  LINKS: 'List of helpful links (website, socials) for the organization.',
  DOMAINS: 'Domains that are allowed to create events on behalf of the organization.',
  EVENT_DEFAULTS: 'Default settings (visibility, reminders) applied to events.',
  EVENT_DEFAULT_VISIBILITY: 'Visibility default applied to events created under this org.',
  EVENT_DEFAULT_REMINDERS: 'Whether reminders should be on by default.',
  EVENT_DEFAULT_WAITLIST: 'Whether waitlists should be enabled by default.',
  EVENT_DEFAULT_PLUS_ONES: 'Whether guest + ones are allowed by default.',
  FOLLOWERS_COUNT: 'Number of accepted followers for the organization.',
  FOLLOWABLE: 'Toggle to determine if the organization can be followed.',
  FOLLOW_POLICY:
    'Policy for accepting new followers: Public (auto-accept all) or RequireApproval (manual approval required). Default: Public',
  TAGS: 'Discovery tags used to surface the organization.',
  MEMBER_ROLES: 'Membership roles granted to users within the organization.',
};

export const ORGANIZATION_MEMBERSHIP_DESCRIPTIONS = {
  TYPE: 'Represents a user membership in an organization, including role and join date.',
  CREATE_INPUT: 'Input type for inviting or adding a user to an organization with a specific role.',
  UPDATE_INPUT: 'Input type for updating an existing membership.',
  DELETE_INPUT: 'Input type for removing a user from an organization.',
  ID: "Unique identifier for the membership record (e.g., 'orgMembership123')",
  ORGANIZATION_ID: 'Organization id that owns the membership.',
  USER_ID: 'User id that belongs to the organization.',
  ROLE: 'Role granted to the user inside the organization.',
  JOINED_AT: 'Timestamp when the membership was created.',
  USERNAME: 'Resolved username for the member (mirrors the user record).',
};

export const VENUE_DESCRIPTIONS = {
  TYPE: 'Represents a venue (physical or virtual) where events happen.',
  CREATE_INPUT: 'Input type for creating a venue.',
  UPDATE_INPUT: 'Input type for updating a venue.',
  ID: "Unique identifier for the venue (e.g., 'venue123')",
  ORGANIZATION_ID: 'Organization that owns or manages the venue.',
  NAME: 'Name of the venue.',
  ADDRESS: 'Structured address details for a physical location.',
  STREET: 'Street address for the venue.',
  CITY: 'City where the venue is located.',
  REGION: 'State, province, or region for the venue.',
  COUNTRY: 'Country where the venue resides.',
  POSTAL_CODE: 'Postal or ZIP code for the venue.',
  GEO: 'Geographical coordinates for the venue.',
  LATITUDE: 'Latitude coordinate of the venue.',
  LONGITUDE: 'Longitude coordinate of the venue.',
  URL: 'Optional link for virtual venues or website.',
  CAPACITY: 'Maximum number of guests the venue can hold.',
  AMENITIES: 'List of amenities offered at the venue.',
  SLUG: 'URL-friendly identifier (kebab-case) used for venue detail routes.',
  IMAGES: 'List of image URLs that showcase the venue.',
  FEATURED_IMAGE_URL: 'Primary image used to highlight the venue in listings and detail pages.',
};

export const RESOLVER_DESCRIPTIONS = {
  ADMIN: {
    readAdminDashboardStats: 'Read high-level admin dashboard statistics (events, categories, users).',
  },
  EVENT: {
    createEvent: 'Create a new event. Requires input data for creating a new event and returns the created event.',
    updateEvent: 'Update an existing event. Requires input data for updating the event and returns the updated event.',
    splitEventSeriesAtOccurrence:
      'Split a recurring event series at one occurrence boundary, leaving past occurrences on the original series and creating a successor series for that occurrence and all following ones.',
    deleteEventById:
      'Delete an event by its ID. Requires the event ID and returns the deleted event or a 404 Error if not found.',
    deleteEventBySlug:
      'Delete an event by its Slug. Requires the event Slug and returns the deleted event or a 404 Error if not found.',
    readEventById: 'Read an event by its ID. Requires the event ID and returns the event or a 404 Error if not found.',
    readEventBySlug: 'Read an event by its slug. Requires the slug and returns the event or a 404 Error if not found.',
    readEvents:
      'Read a list of events. Accepts optional query options for pagination, sorting, and filtering and returns a list of events.',
    readEventOccurrences:
      'Read occurrence-oriented event results within a required date window. Results are served from persisted EventOccurrence rows inside the current materialization window.',
    updateEventOccurrence:
      'Edit one recurring event occurrence as an exception without changing the rest of the series.',
    cancelEventOccurrence:
      'Cancel one recurring event occurrence as an exception without changing the rest of the series.',
  },
  EVENT_OCCURRENCE_PARTICIPANT: {
    upsertEventOccurrenceParticipant: 'Create or update an RSVP for the authenticated user on an event occurrence.',
    cancelEventOccurrenceParticipant: 'Cancel the authenticated user’s RSVP for an event occurrence.',
    checkInEventOccurrenceParticipant: 'Check the authenticated user in to an event occurrence.',
    readEventOccurrenceParticipants: 'Read the participant list for an event occurrence.',
    myEventOccurrenceRsvps: "Read the current authenticated user's occurrence RSVPs.",
    myEventOccurrenceRsvpStatus: "Get the current authenticated user's RSVP for an event occurrence.",
  },
  EVENT_CATEGORY: {
    createEventCategory:
      'Create a new event category. Requires input data for creating a new category and returns the created category.',
    updateEventCategory:
      'Update an existing event category. Requires input data for updating the category and returns the updated category.',
    deleteEventCategoryById:
      'Delete an event category by its ID. Requires the category ID and returns the deleted category or 404 Error if not found.',
    deleteEventCategoryBySlug:
      'Delete an event category by its Slug. Requires the category slug and returns the deleted category or 404 Error if not found.',
    readEventCategoryById:
      'Read an event category by its ID. Requires the category ID and returns the category or a 404 Error if not found.',
    readEventCategoryBySlug:
      'Read an event category by its slug. Requires the slug and returns the category or a 404 Error if not found.',
    readEventCategories:
      'Read a list of event categories. Accepts optional query options for pagination and filtering and returns a list of categories.',
  },
  EVENT_CATEGORY_GROUP: {
    createEventCategoryGroup: 'Create a new event category group.',
    updateEventCategoryGroup: 'Update an existing event category.',
    deleteEventCategoryGroupBySlug: 'Delete an event category group by its Slug',
    readEventCategoryGroupBySlug: 'Read an event category by its Slug',
    readEventCategoryGroups: 'Read a list of event category Groups',
  },
  USER: {
    createUser:
      'Create a new user. Requires input data for creating a new user and returns the created user along with an authentication token.',
    loginUser:
      'Log in a user. Requires input data for logging in and returns the user along with an authentication token.',
    updateUser: 'Update an existing user. Requires input data for updating the user and returns the updated user.',
    deleteUserById:
      'Delete a user by their ID. Requires the user ID and returns the deleted user or 404 Error if not found.',
    deleteUserByEmail:
      'Delete a user by their Email. Requires the user email and returns the deleted user or 404 Error if not found.',
    deleteUserByUsername:
      'Delete a user by their username. Requires the user username and returns the deleted user or a 404 Error if not found.',
    readUserById: 'Read a user by their ID. Requires the user ID and returns the user or 404 Error if not found.',
    readUserByUsername:
      'Read a user by their username. Requires the username and returns the user or 404 Error if not found.',
    readUserByEmail: 'Read a user by their email. Requires the email and returns the user or 404 Error if not found.',
    readUsers:
      'Read a list of users. Accepts optional query options for pagination and filtering and returns a list of users.',
    requestEmailVerification:
      'Send an email verification link to the supplied address. Returns true when the email is dispatched.',
    verifyEmail: 'Validate an email verification token and mark the account as verified. Returns the updated user.',
  },
  FOLLOW: {
    follow: 'Create or re-activate a follow connection from the authenticated user.',
    unfollow: 'Remove a follow connection initiated by the authenticated user.',
    acceptFollowRequest: 'Accept a pending follow request (called by the user being followed)',
    rejectFollowRequest: 'Reject a pending follow request (called by the user being followed).',
    removeFollower: 'Remove a follower from your account.',
    readFollowing: 'List the users and organizations that the authenticated user follows.',
    readFollowers: 'List followers for a specific user or organization.',
    readPendingFollowRequests: "List pending follow requests awaiting the authenticated user's approval.",
  },
  ACTIVITY: {
    logActivity: 'Log a new activity event for the authenticated user.',
    readActivitiesByActor: 'Retrieve activities authored by a given actor.',
    readFeed: 'Read a feed of activities relevant to the authenticated user.',
  },
  ORGANIZATION: {
    createOrganization: 'Create a new organization with policy defaults and return the created record.',
    updateOrganization: 'Update the metadata or policies for an existing organization.',
    deleteOrganizationById:
      'Delete an organization by its ID. Requires the org ID and returns the deleted organization.',
    readOrganizationById: 'Read an organization by its ID. Returns the organization or a 404 Error if not found.',
    readOrganizationBySlug: 'Read an organization by its slug. Returns the organization or a 404 Error if not found.',
    readOrganizations: 'Read a list of organizations. Supports optional query options for filtering and pagination.',
  },
  VENUE: {
    createVenue: 'Create a new venue. Requires organization, location, and type data.',
    updateVenue: 'Update an existing venue with new address or capacity data.',
    deleteVenueById: 'Delete a venue by its ID. Requires the venue ID and returns the deleted venue.',
    readVenueById: 'Read a venue by its ID. Returns the venue or a 404 Error if not found.',
    readVenueBySlug: 'Read a venue by its slug. Returns the venue or a 404 Error if not found.',
    readVenues: 'Read a list of venues. Supports optional query options for filtering and pagination.',
    readVenuesByOrgId: 'Read venues scoped to an organization. Requires the organization ID.',
  },
  ORGANIZATION_MEMBERSHIP: {
    createOrganizationMembership: 'Add a user to an organization with the supplied role.',
    updateOrganizationMembership: 'Update the role for an existing organization membership.',
    deleteOrganizationMembership: 'Remove a user from an organization.',
    readOrganizationMembershipById: 'Read a membership by its ID. Returns the membership or a 404 Error if not found.',
    readOrganizationMembershipsByOrgId: 'Read all memberships that belong to an organization.',
  },
  FEED: {
    readRecommendedFeed:
      'Read the personalised event feed for the authenticated user, sorted by relevance score. Lazily recomputes if empty or stale.',
    refreshFeed:
      "Manually trigger a full recomputation of the authenticated user's feed and return true when complete.",
  },
  MEDIA: {
    getMediaUploadUrl: 'Get a pre-signed S3 URL for uploading media directly to S3.',
    getEventMomentUploadUrl:
      'Get a pre-signed S3 URL for uploading an event moment media file. ' +
      'Enforces event existence, posting window, RSVP (Going/CheckedIn), and per-user rate limit ' +
      'before issuing the URL — preventing unauthorized MediaConvert job submissions.',
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
  SEARCH: {
    INPUT: 'Text search options for matching a value across multiple fields (case-insensitive by default).',
    OPTIONS: 'Text search metadata for free-text queries.',
    FIELDS: 'Fields to search within (provide at least one).',
    VALUE: 'Text to match against the provided fields.',
    CASE_SENSITIVE: 'Set to true to force case-sensitive matching.',
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
