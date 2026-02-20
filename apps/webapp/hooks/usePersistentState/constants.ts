import type { StorageType } from './types';

export const DEFAULT_NAMESPACE = 'gatherle:sessionstate';
export const DEFAULT_STORAGE: StorageType = 'localStorage';
export const MAX_RETRY_ATTEMPTS = 3;
export const INITIAL_RETRY_DELAY_MS = 1000;
export const MAX_RETRY_DELAY_MS = 10000;

export const STORAGE_NAMESPACES = {
  FILTERS: 'filters',
  LOCATION: 'location',
  EVENT_MUTATION: 'event-mutation',
  VENUE_MUTATION: 'venue-mutation',
  PREFERENCES: 'preferences',
} as const;

export const STORAGE_KEYS = {
  EVENTS_FILTER_STATE: 'events-filter-state',
  USER_LOCATION: 'user-location',
  VENUE_CREATION_FORM: 'venue-creation-form',
  THEME_MODE: 'theme-mode',
  LAST_OPEN_CHAT_USERNAME: 'gatherle:last-open-chat-username',
  CHAT_EMOJI_RECENTS: 'gatherle:chat-emoji-recents',
} as const;
