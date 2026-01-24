import { Metadata } from 'next';
import { Container } from '@mui/material';
import EventsPageClient from '@/components/events/EventsPageClient';

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
  return (
    <Container>
      <EventsPageClient />
    </Container>
  );
}
