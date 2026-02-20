import type { Metadata } from 'next';
import VenueDetailPageClient from '@/components/venue/VenueDetailPageClient';
import { getClient } from '@/data/graphql';
import { GetVenueBySlugDocument, GetVenueBySlugQuery } from '@/data/graphql/types/graphql';
import { buildPageMetadata } from '@/lib/metadata';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const { data } = await getClient().query<GetVenueBySlugQuery>({
      query: GetVenueBySlugDocument,
      variables: { slug },
    });
    const venue = data.readVenueBySlug;

    if (venue) {
      const locationParts = [venue.address?.city, venue.address?.region, venue.address?.country].filter(Boolean);
      const locationLabel = locationParts.join(', ');
      return buildPageMetadata({
        title: venue.name,
        description:
          `View venue details${locationLabel ? ` in ${locationLabel}` : ''}, amenities, and upcoming events on Gatherle.`.trim(),
        keywords: [venue.name, 'venue details', 'event venue', 'venue amenities'],
      });
    }
  } catch {
    // TODO: Fall through to fallback metadata
  }

  return buildPageMetadata({
    title: 'Venue Details',
    description: 'View venue details, amenities, and event hosting information on Gatherle.',
    keywords: ['venue details', 'event venues', 'venue amenities'],
  });
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <VenueDetailPageClient slug={slug} />;
}
