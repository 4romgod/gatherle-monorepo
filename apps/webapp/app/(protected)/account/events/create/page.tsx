import React from 'react';
import { Metadata } from 'next';
import { Box, Container } from '@mui/material';
import { getClient } from '@/data/graphql';
import { GetAllEventCategoriesDocument } from '@/data/graphql/types/graphql';
import EventMutationForm from '@/components/forms/event-mutation';

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

export default async function CreateEvent() {
  const { data: eventCategories } = await getClient().query({
    query: GetAllEventCategoriesDocument,
  });

  return (
    <Box
      component="main"
      sx={{
        backgroundColor: 'background.paper',
      }}
    >
      <Container maxWidth="md">
        <EventMutationForm categoryList={eventCategories.readEventCategories} />
      </Container>
    </Box>
  );
}
