/**
 * Determine whether the event is public, private, or accessible by invitation only.
 * @export
 * @enum {string}
 */
export enum EventPrivacySetting {
    PUBLIC = 'Public',
    PRIVATE = 'Private',
    INVITATION = 'Invitation',
}

/**
 * The current status of the event.
 * @export
 * @enum {string}
 */
export enum EventStatus {
    CANCELLED = 'Cancelled',
    COMPLETED = 'Completed',
    ONGOING = 'Ongoing',
    UPCOMING = 'Upcoming',
}

export enum EventCategory {
    ARTS = 'Arts',
    MUSIC = 'Music',
    TECH = 'Technology',
    HEALTH = 'Health',
    FITNESS = 'Fitness',
    FOOD = 'Food',
    DRINKS = 'Drinks',
    TRAVEL = 'Travel',
    CONCERT = 'Concert',
    CONFERENCE = 'Conference',
    NETWORKING = 'Networking',
    PARTYING = 'Partying',
    SPORT = 'Sport',
    WORKSHOP = 'Workshop',
    OTHER = 'Other',
}

export type IEvent = {
    /**
     * The unique ID of the event.
     * @type {string}
     */
    id?: string;
    /**
     * The title of the event.
     * @type {string}
     */
    title: string;
    /**
     * The description of the event.
     * @type {string}
     */
    description: string;
    /**
     * The start date and time of the event.
     * @type {string}
     */
    startDate: string;
    /**
     * The end date and time of the event.
     * @type {string}
     */
    endDate: string;
    /**
     * The location where the event takes place, i.e. Can be virtual.
     * @type {string}
     */
    location: string;
    /**
     * They group events based on their fundamental characteristics and the kind of experience they offer to participants.
     * @type {Array<string>}
     */
    eventCategory: Array<string>;
    /**
     * The number of people that the event can occupy
     * @type {number}
     */
    capacity?: number;
    /**
     * Wheather the event has happened, or yet to happen
     * @type {EventStatus}
     */
    status: EventStatus;
    /**
     * Information about the individuals or organizations hosting the event.
     * @type {Array<string>}
     */
    organizers: Array<string>;
    /**
     * The IDs of the people to RSVP into the event.
     * @type {Array<string>}
     */
    rSVPs?: Array<string>;
    /**
     *
     * @type {{ [key: string]: any; }}
     */
    tags?: {
        [key: string]: any;
    };
    /**
     *
     * @type {{ [key: string]: any; }}
     */
    media: {
        featuredImageUrl: string;
        otherMediaData?: any;
    };
    /**
     *
     * @type {{ [key: string]: any; }}
     */
    additionalDetails?: {
        [key: string]: any;
    };
    /**
     *
     * @type {{ [key: string]: any; }}
     */
    comments?: {
        [key: string]: any;
    };
    /**
     *
     * @type {EventPrivacySetting}
     */
    privacySetting?: EventPrivacySetting;
    /**
     * A link to the event\'s website or registration page.
     * @type {string}
     */
    eventLink?: string;
    /**
     * Timestamp for when a document is created
     * @type {string}
     */
    createdAt?: string;
    /**
     * Timestamp for when a document is last updated
     * @type {string}
     */
    updatedAt?: string;
};

export type ICreateEvent = Omit<IEvent, 'id'>;

export type IUpdateEvent = Omit<IEvent, 'id'>;
