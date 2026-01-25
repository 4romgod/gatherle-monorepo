import type { Metadata } from 'next';
import EventDetailPageClient from '@/components/events/EventDetailPageClient';

export const metadata: Metadata = {
  title: {
    default: 'Ntlango',
    template: 'Ntlango',
  },
  icons: {
    icon: '/logo-img.png',
    shortcut: '/logo-img.png',
    apple: '/logo-img.png',
  },
};

// Force dynamic rendering to ensure fresh participant data
export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <EventDetailPageClient slug={slug} />;
}
