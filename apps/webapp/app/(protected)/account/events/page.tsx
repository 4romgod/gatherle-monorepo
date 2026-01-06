import EventBox from '@/components/events/event-box';
import { FilterOperatorInput, GetAllEventsDocument } from '@/data/graphql/types/graphql';
import { getClient } from '@/data/graphql';
import { auth } from '@/auth';
import { ROUTES } from '@/lib/constants';
import Link from 'next/link';

export default async function EventsPage() {
  const session = await auth();
  if (!session) {
    return;
  }

  const { data: events } = await getClient().query({
    query: GetAllEventsDocument,
    variables: {
      options: {
        filters: [
          {
            field: 'organizers.user.userId',
            operator: FilterOperatorInput.Eq,
            value: session.user.userId,
          },
        ],
      },
    },
  });

  return (
    <main>
      <div>
        {events.readEvents.map(event => {
          return (
            <Link key={event.eventId} href={ROUTES.ACCOUNT.EVENTS.EVENT(event.slug)}>
              <EventBox key={event.eventId} event={event} />;
            </Link>
          );
        })}
      </div>
      <h1>Events Page</h1>
    </main>
  );
}
