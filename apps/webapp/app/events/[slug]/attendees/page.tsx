import type { Metadata } from 'next';
import EventAttendeesPageClient from '@/components/events/EventAttendeesPageClient';

export const metadata: Metadata = {
  title: 'Event Attendees • Ntlango',
};

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <EventAttendeesPageClient slug={slug} />;
}
