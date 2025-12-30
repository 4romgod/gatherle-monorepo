import { Metadata } from 'next';
import { getClient } from '@/data/graphql';
import { EventCategory, GetAllEventCategoriesDocument, GetAllEventsDocument } from '@/data/graphql/types/graphql';
import { EventPreview } from '@/data/graphql/query/Event/types';
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

export default async function Events() {
  const { data: events } = await getClient().query({
    query: GetAllEventsDocument,
  });
  const { data: eventCategories } = await getClient().query({
    query: GetAllEventCategoriesDocument,
  });

  const allCategories: EventCategory[] = eventCategories.readEventCategories;
  const eventsList = (events.readEvents ?? []) as EventPreview[];

  return <EventsClientWrapper events={eventsList} categories={allCategories} />;
}
