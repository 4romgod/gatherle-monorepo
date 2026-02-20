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
  ARN: 'eu-north-1',
  AUH: 'me-central-1',
  BOM: 'ap-south-1',
  CDG: 'eu-west-3',
  DUB: 'eu-west-1',
  CMH: 'us-east-2',
  CPT: 'af-south-1',
  DXB: 'me-central-1',
  FRA: 'eu-central-1',
  GRU: 'sa-east-1',
  IAD: 'us-east-1',
  ICN: 'ap-northeast-2',
  KIX: 'ap-northeast-3',
  LHR: 'eu-west-2',
  MEL: 'ap-southeast-4',
  NRT: 'ap-northeast-1',
  PDT: 'us-gov-west-1',
  PDX: 'us-west-2',
  SFO: 'us-west-1',
  SIN: 'ap-southeast-1',
  SYD: 'ap-southeast-2',
  YUL: 'ca-central-1',
  ZHY: 'cn-northwest-1',
};

export enum DATE_FILTER_OPTIONS {
  TODAY = 'TODAY',
  TOMORROW = 'TOMORROW',
  THIS_WEEK = 'THIS_WEEK',
  THIS_WEEKEND = 'THIS_WEEKEND',
  THIS_MONTH = 'THIS_MONTH',
  CUSTOM = 'CUSTOM', // UI-only: frontend uses this to show date picker, backend receives customDate field
}

export type DateFilterOption = Exclude<DATE_FILTER_OPTIONS, DATE_FILTER_OPTIONS.CUSTOM>;

export const DATE_FILTER_LABELS: Record<DATE_FILTER_OPTIONS, string> = {
  [DATE_FILTER_OPTIONS.TODAY]: 'Today',
  [DATE_FILTER_OPTIONS.TOMORROW]: 'Tomorrow',
  [DATE_FILTER_OPTIONS.THIS_WEEK]: 'This Week',
  [DATE_FILTER_OPTIONS.THIS_WEEKEND]: 'This Weekend',
  [DATE_FILTER_OPTIONS.THIS_MONTH]: 'This Month',
  [DATE_FILTER_OPTIONS.CUSTOM]: 'Custom',
};

export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHENTICATED = 401,
  UNAUTHORIZED = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
}
