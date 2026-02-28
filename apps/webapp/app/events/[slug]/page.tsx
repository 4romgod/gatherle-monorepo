import type { Metadata } from 'next';
import EventDetailPageClient from '@/components/events/EventDetailPageClient';
import { getClient } from '@/data/graphql';
import { GetEventBySlugDocument, GetEventBySlugQuery } from '@/data/graphql/types/graphql';
import { buildPageMetadata } from '@/lib/metadata';
import { APP_NAME } from '@/lib/constants';

// Force dynamic rendering to ensure fresh participant data
export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

const truncateDescription = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined;
  }
  if (value.length <= 160) {
    return value;
  }
  return `${value.slice(0, 157)}...`;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const { data } = await getClient().query<GetEventBySlugQuery>({
      query: GetEventBySlugDocument,
      variables: { slug },
    });

    const event = data.readEventBySlug;
    if (event) {
      const eventCategories = event.eventCategories?.map((category) => category.name) ?? [];
      return buildPageMetadata({
        title: event.title,
        description:
          truncateDescription(event.summary) ??
          truncateDescription(event.description) ??
          `View event details, venue information, and RSVP options on ${APP_NAME}.`,
        keywords: ['event details', 'RSVP', ...eventCategories],
      });
    }
  } catch {
    // TODO: Fall through to default metadata
  }

  return buildPageMetadata({
    title: 'Event Details',
    description: `View event details, venue information, and RSVP options on ${APP_NAME}.`,
    keywords: ['event details', 'RSVP', 'upcoming events'],
  });
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <EventDetailPageClient slug={slug} />;
}
