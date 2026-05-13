import * as Calendar from 'expo-calendar';
import { Alert, Linking, Platform, Share } from 'react-native';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { formatLocationLabel, getEventTitle } from '@/lib/events/formatters';

const DEFAULT_WEBAPP_URL = 'https://gatherle.com';

function trimSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function getWebappBaseUrl() {
  return trimSlash(process.env.EXPO_PUBLIC_WEBAPP_URL?.trim() || DEFAULT_WEBAPP_URL);
}

export function buildEventWebUrl(occurrence: MobileEventOccurrence) {
  const slug = occurrence.eventSeries?.slug;
  return slug ? `${getWebappBaseUrl()}/events/${slug}` : `${getWebappBaseUrl()}/events`;
}

function getAddressQuery(occurrence: MobileEventOccurrence) {
  const address = occurrence.eventSeries?.location?.address;
  const parts = [address?.city, address?.state, address?.country].filter(Boolean);
  return parts.join(', ') || formatLocationLabel(occurrence);
}

async function openUrl(url: string) {
  const supported = await Linking.canOpenURL(url);

  if (!supported) {
    throw new Error('This app is not available on your device.');
  }

  await Linking.openURL(url);
}

export async function openEventLocationInMaps(occurrence: MobileEventOccurrence) {
  const query = getAddressQuery(occurrence);

  if (!query || query === 'Location to be announced') {
    throw new Error('This event does not have a usable location yet.');
  }

  const encodedQuery = encodeURIComponent(query);
  const options: Array<{ label: string; url: string }> = [];

  if (Platform.OS === 'ios') {
    options.push({ label: 'Apple Maps', url: `http://maps.apple.com/?q=${encodedQuery}` });
  }

  options.push({ label: 'Google Maps', url: `comgooglemaps://?q=${encodedQuery}` });
  options.push({ label: 'Waze', url: `waze://?q=${encodedQuery}&navigate=yes` });
  options.push({ label: 'Browser', url: `https://www.google.com/maps/search/?api=1&query=${encodedQuery}` });

  const availableOptions: Array<{ label: string; onPress: () => void; style?: 'cancel' | 'default' }> = [];

  for (const option of options) {
    if (option.label === 'Browser') {
      availableOptions.push({
        label: option.label,
        onPress: () => {
          void Linking.openURL(option.url);
        },
      });
      continue;
    }

    if (await Linking.canOpenURL(option.url)) {
      availableOptions.push({
        label: option.label,
        onPress: () => {
          void Linking.openURL(option.url);
        },
      });
    }
  }

  availableOptions.push({
    label: 'Cancel',
    onPress: () => {},
    style: 'cancel',
  });

  Alert.alert('Open directions', 'Choose a maps app', availableOptions);
}

function formatCalendarDate(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

function formatCalendarDateInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone,
    year: 'numeric',
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';

  return `${getPart('year')}${getPart('month')}${getPart('day')}T${getPart('hour')}${getPart('minute')}${getPart('second')}`;
}

function buildGoogleCalendarUrl(occurrence: MobileEventOccurrence) {
  const title = encodeURIComponent(getEventTitle(occurrence));
  const details = encodeURIComponent(
    `${occurrence.eventSeries?.summary || occurrence.eventSeries?.description || ''}\n\n${buildEventWebUrl(occurrence)}`.trim(),
  );
  const location = encodeURIComponent(getAddressQuery(occurrence));
  const startDate = occurrence.startAt ? new Date(occurrence.startAt) : new Date();
  const endDate = occurrence.endAt ? new Date(occurrence.endAt) : new Date(startDate.getTime() + 60 * 60 * 1000);
  const timeZone = occurrence.timezone?.trim();
  const dates = timeZone
    ? `${formatCalendarDateInTimeZone(startDate, timeZone)}/${formatCalendarDateInTimeZone(endDate, timeZone)}`
    : `${formatCalendarDate(startDate)}/${formatCalendarDate(endDate)}`;
  const ctz = timeZone ? `&ctz=${encodeURIComponent(timeZone)}` : '';

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}${ctz}`;
}

export async function addEventToCalendar(occurrence: MobileEventOccurrence) {
  if (!occurrence.startAt) {
    throw new Error('This event does not have a scheduled start time yet.');
  }

  if (Platform.OS === 'web') {
    await Linking.openURL(buildGoogleCalendarUrl(occurrence));
    return;
  }

  const permission = await Calendar.requestCalendarPermissionsAsync();

  if (permission.status !== 'granted') {
    throw new Error('Calendar permission is required to save this event.');
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writableCalendar =
    calendars.find((calendar) => calendar.allowsModifications && !calendar.isSynced) ||
    calendars.find((calendar) => calendar.allowsModifications) ||
    calendars[0];

  if (!writableCalendar) {
    throw new Error('No writable calendar was found on this device.');
  }

  const startDate = new Date(occurrence.startAt);
  const endDate = occurrence.endAt ? new Date(occurrence.endAt) : new Date(startDate.getTime() + 60 * 60 * 1000);

  await Calendar.createEventAsync(writableCalendar.id, {
    alarms: [{ relativeOffset: -60 }],
    endDate,
    location: getAddressQuery(occurrence),
    notes:
      `${occurrence.eventSeries?.summary || occurrence.eventSeries?.description || ''}\n\n${buildEventWebUrl(occurrence)}`.trim(),
    startDate,
    timeZone: occurrence.timezone,
    title: getEventTitle(occurrence),
  });
}

export async function shareEvent(occurrence: MobileEventOccurrence) {
  const eventUrl = buildEventWebUrl(occurrence);
  const eventTitle = getEventTitle(occurrence);
  await Share.share({
    message: `${eventTitle}\n${eventUrl}`,
    title: eventTitle,
    url: eventUrl,
  });
}
