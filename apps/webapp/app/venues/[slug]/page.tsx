import type { Metadata } from 'next';
import VenueDetailPageClient from '@/components/venue/VenueDetailPageClient';

export const metadata: Metadata = {
  title: 'Venue · Ntlango',
};

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <VenueDetailPageClient slug={slug} />;
}
