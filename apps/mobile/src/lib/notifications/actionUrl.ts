import type { ApolloClient } from '@apollo/client';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import {
  GetEventBySlugForNavigationDocument,
  GetOrganizationBySlugDocument,
  GetUserByUsernameDocument,
} from '@data/graphql/types/graphql';
import type {
  GetEventBySlugForNavigationQuery,
  GetOrganizationBySlugQuery,
  GetUserByUsernameQuery,
} from '@data/graphql/types/graphql';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import type { SettingsTabKey } from '@/app/navigation/routes';
import { getApolloAuthContext } from '@/lib/auth';
import { getDisplayName } from '@/lib/events/formatters';
import { PUBLIC_OCCURRENCE_QUERY_PARAM, getOccurrencePublicAnchor } from '@/lib/events/occurrenceUrl';

const URL_BASE = 'https://gatherle.local';

type NavigateFromNotificationActionUrlParams = {
  actionUrl?: string | null;
  apolloClient: ApolloClient<object>;
  authToken: string | null;
  navigation: MainTabNavigation;
};

function mapSettingsTab(value: string | null): SettingsTabKey {
  switch (value) {
    case 'profile':
    case 'account':
    case 'personal':
    case 'privacy':
    case 'activity':
    case 'alerts':
      return value;
    case 'appearance':
    case 'theme':
      return 'appearance';
    default:
      return 'account';
  }
}

function buildOccurrenceFromEvent(
  event: NonNullable<GetEventBySlugForNavigationQuery['readEventBySlug']>,
  occurrenceAnchor: string | null,
): MobileEventOccurrence | null {
  const candidates = [
    ...(event.upcomingOccurrences ?? []),
    ...(event.representativeOccurrence ? [event.representativeOccurrence] : []),
  ];

  if (candidates.length === 0) {
    return null;
  }

  const selectedOccurrence =
    (occurrenceAnchor
      ? candidates.find((occurrence) => getOccurrencePublicAnchor(occurrence.originalStartAt) === occurrenceAnchor)
      : null) ?? candidates[0];

  return {
    ...selectedOccurrence,
    eventSeries: {
      ...event,
    },
  } as MobileEventOccurrence;
}

export async function navigateFromNotificationActionUrl({
  actionUrl,
  apolloClient,
  authToken,
  navigation,
}: NavigateFromNotificationActionUrlParams): Promise<boolean> {
  if (!actionUrl) {
    return false;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(actionUrl, URL_BASE);
  } catch {
    return false;
  }

  const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';
  const queryOptions = authToken ? getApolloAuthContext(authToken) : {};

  if (pathname === '/' || pathname === '/home') {
    navigation.navigate('MainTabs', { screen: 'Home' });
    return true;
  }

  if (pathname === '/events') {
    navigation.navigate('MainTabs', { screen: 'Events' });
    return true;
  }

  if (pathname === '/moments') {
    navigation.navigate('MainTabs', { screen: 'Moments' });
    return true;
  }

  if (pathname === '/account/messages') {
    navigation.navigate('MainTabs', { screen: 'Messages' });
    return true;
  }

  if (pathname === '/account/notifications') {
    navigation.navigate('MainTabs', { screen: 'Notifications' });
    return true;
  }

  if (pathname === '/account') {
    navigation.navigate('Settings', {
      initialTab: mapSettingsTab(parsedUrl.searchParams.get('tab')),
    });
    return true;
  }

  if (pathname.startsWith('/users/')) {
    const username = pathname.slice('/users/'.length).trim();
    if (!username) {
      return false;
    }

    const { data } = await apolloClient.query<GetUserByUsernameQuery>({
      fetchPolicy: 'cache-first',
      query: GetUserByUsernameDocument,
      variables: { username },
      ...queryOptions,
    });

    const user = data.readUserByUsername;
    if (!user?.userId) {
      return false;
    }

    navigation.navigate('UserProfile', {
      avatarUrl: user.profile_picture ?? undefined,
      displayName: getDisplayName(user),
      userId: user.userId,
      username: user.username ?? undefined,
    });
    return true;
  }

  if (pathname.startsWith('/organizations/')) {
    const slug = pathname.slice('/organizations/'.length).trim();
    if (!slug) {
      return false;
    }

    const { data } = await apolloClient.query<GetOrganizationBySlugQuery>({
      fetchPolicy: 'cache-first',
      query: GetOrganizationBySlugDocument,
      variables: { slug },
      ...queryOptions,
    });

    const organization = data.readOrganizationBySlug;
    if (!organization?.orgId) {
      return false;
    }

    navigation.navigate('OrganizationDetails', {
      orgId: organization.orgId,
      orgName: organization.name,
    });
    return true;
  }

  if (pathname.startsWith('/events/')) {
    const slug = pathname.slice('/events/'.length).trim();
    if (!slug) {
      return false;
    }

    const { data } = await apolloClient.query<GetEventBySlugForNavigationQuery>({
      fetchPolicy: 'cache-first',
      query: GetEventBySlugForNavigationDocument,
      variables: {
        occurrencesFromDate: new Date().toISOString(),
        slug,
      },
      ...queryOptions,
    });

    const event = data.readEventBySlug;
    const occurrence = event
      ? buildOccurrenceFromEvent(event, parsedUrl.searchParams.get(PUBLIC_OCCURRENCE_QUERY_PARAM))
      : null;

    if (!occurrence) {
      return false;
    }

    navigation.navigate('EventDetails', { occurrence });
    return true;
  }

  return false;
}
