import * as Calendar from 'expo-calendar';
import { Linking, Platform, Share } from 'react-native';
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

async function openFirstAvailableUrl(urls: string[]) {
  for (const url of urls) {
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
      return;
    }
  }

  throw new Error('No maps app is available on this device.');
}

export async function openLocationQueryInMaps(query: string) {
  if (!query || query === 'Location to be announced') {
    throw new Error('This event does not have a usable location yet.');
  }

  const encodedQuery = encodeURIComponent(query);
  const browserFallback = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

  if (Platform.OS === 'web') {
    await Linking.openURL(browserFallback);
    return;
  }

  if (Platform.OS === 'ios') {
    await openFirstAvailableUrl([
      `maps://?q=${encodedQuery}`,
      `http://maps.apple.com/?q=${encodedQuery}`,
      browserFallback,
    ]);
    return;
  }

  await openFirstAvailableUrl([`geo:0,0?q=${encodedQuery}`, `google.navigation:q=${encodedQuery}`, browserFallback]);
}

export async function openEventLocationInMaps(occurrence: MobileEventOccurrence) {
  await openLocationQueryInMaps(getAddressQuery(occurrence));
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

  const startDate = new Date(occurrence.startAt);
  const endDate = occurrence.endAt ? new Date(occurrence.endAt) : new Date(startDate.getTime() + 60 * 60 * 1000);

  await Calendar.createEventInCalendarAsync({
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
