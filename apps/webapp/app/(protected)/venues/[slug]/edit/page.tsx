import { Metadata } from 'next';
import { auth } from '@/auth';
import VenueEditForm from '@/components/venue/VenueEditForm';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Edit Venue',
  description: 'Update venue details, address, capacity, and media.',
  noIndex: true,
});

export default async function EditVenuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();

  return <VenueEditForm slug={slug} token={session?.user?.token} />;
}
