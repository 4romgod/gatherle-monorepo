const EVENT_STATUS_VALUES = ['Cancelled', 'Completed', 'Ongoing', 'Upcoming'];
const GENDER_VALUES = ['Male', 'Female', 'Other'];

export const ERROR_MESSAGES = {
    ATLEAST_ONE: (type: string) => `Atleast one ${type} is required`,
    INVALID: 'is invalid',
    INVALID_DATE: 'should be in YYYY-MM-DD format',
    INVALID_EMAIL: 'Invalid email format',
    INVALID_EVENT_STATUS: `Invalid event status, should be ${EVENT_STATUS_VALUES.slice(0, -1).join(', ') + ', or ' + EVENT_STATUS_VALUES.slice(-1)}`,
    INVALID_GENDER: `Invalid gender input, should be ${GENDER_VALUES.slice(0, -1).join(', ') + ', or ' + GENDER_VALUES.slice(-1)}`,
    INVALID_PASSWORD: 'Password should be at least 8 characters long',
    INVALID_PHONE_NUMBER: 'Invalid phone number format',
    INVALID_QUERY: "Your query doesn't match the schema. Try double-checking it!",
    INVALID_TIME: 'should be in HH:mm format',
    NOT_FOUND: (searchedItemType: string, searchParamType: string, searchParamValue: string) =>
        `${searchedItemType} with ${searchParamType} ${searchParamValue} does not exist`,
    PASSWORD_MISMATCH: 'Email and Password do not match',
    REQUIRED: 'is required',
    TOO_SHORT: 'is too short',
    UNAUTHENTICATED: 'You must be logged in to access this resource.',
    UNAUTHORIZED: "You don't have permission to access this resource.",
};

export const APPLICATION_STAGES = {
    DEV: 'Dev',
    BETA: 'Beta',
    GAMMA: 'Gamma',
    PROD: 'Prod',
};

export const AWS_REGIONS = {
    Ireland: 'eu-west-1',
    N_Virginia: 'us-east-1',
    Ohio: 'us-east-2',
};

export const DATE_FILTER_OPTIONS = {
    TODAY: 'today',
    TOMORROW: 'tomorrow',
    THIS_WEEK: 'this-week',
    THIS_WEEKEND: 'this-weekend',
    THIS_MONTH: 'this-month',
    CUSTOM: 'custom', // UI-only: frontend uses this to show date picker, backend receives customDate field
} as const;

export type DateFilterOption = Exclude<(typeof DATE_FILTER_OPTIONS)[keyof typeof DATE_FILTER_OPTIONS], typeof DATE_FILTER_OPTIONS.CUSTOM>;

export const DATE_FILTER_LABELS: Record<(typeof DATE_FILTER_OPTIONS)[keyof typeof DATE_FILTER_OPTIONS], string> = {
    [DATE_FILTER_OPTIONS.TODAY]: 'Today',
    [DATE_FILTER_OPTIONS.TOMORROW]: 'Tomorrow',
    [DATE_FILTER_OPTIONS.THIS_WEEK]: 'This Week',
    [DATE_FILTER_OPTIONS.THIS_WEEKEND]: 'This Weekend',
    [DATE_FILTER_OPTIONS.THIS_MONTH]: 'This Month',
    [DATE_FILTER_OPTIONS.CUSTOM]: 'Custom',
};
