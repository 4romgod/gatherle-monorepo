import { Metadata } from 'next';
import { getClient } from '@/data/graphql';
import { EventCategory } from '@/data/graphql/types/graphql';
import { GetAllEventCategoriesDocument, GetAllEventsDocument, GetPopularOrganizationsDocument } from '@/data/graphql/query';
import { EventPreview } from '@/data/graphql/query/Event/types';
import { PopularOrganization } from '@/components/events/popular-organizer-box';
import EventsClientWrapper from '@/components/events/events-client-wrapper';

export const metadata: Metadata = {
  title: {
    default: 'Ntlango | Events',
    template: 'Ntlango | Events',
  },
  icons: {
    icon: '/logo-img.png',
    shortcut: '/logo-img.png',
    apple: '/logo-img.png',
  },
};

export const revalidate = 60;

export default async function Events() {
  const [{ data: events }, { data: eventCategories }, { data: organizations }] = await Promise.all([
    getClient().query({
      query: GetAllEventsDocument,
    }),
    getClient().query({
      query: GetAllEventCategoriesDocument,
    }),
    // TODO Fetching all organizations just to find the most popular one is inefficient
    getClient().query({
      query: GetPopularOrganizationsDocument,
    }),
  ]);

  const categoryList: EventCategory[] = eventCategories.readEventCategories;
  const eventsList: EventPreview[] = (events.readEvents ?? []);
  const orgsList = organizations.readOrganizations ?? [];

  const popularOrganization: PopularOrganization | null = orgsList.length > 0
    ? (orgsList as PopularOrganization[]).reduce((prev: PopularOrganization, current: PopularOrganization) => {
        const prevFollowers = prev.followersCount ?? 0;
        const currentFollowers = current.followersCount ?? 0;
        return prevFollowers > currentFollowers ? prev : current;
      })
    : null;

  const stats = {
    totalEvents: eventsList.length,
    activeOrganizations: orgsList.length,
  };

  return (
    <EventsClientWrapper
      events={eventsList}
      categories={categoryList}
      popularOrganization={popularOrganization}
      stats={stats}
    />
  );
}
