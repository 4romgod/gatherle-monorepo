import React from 'react';
import { Metadata } from 'next';
import EventMutationForm from '@/components/forms/event-mutation';
import CustomContainer from '@/components/custom-container';
import { Box } from '@mui/material';
import { getClient } from '@/data/graphql';
import { GetAllEventCategoriesDocument } from '@/data/graphql/types/graphql';

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
    <Box component="main">
      <CustomContainer maxWidthOverrides={{ xs: '90%', sm: '75%', md: '65%', lg: '50%' }}>
        <EventMutationForm
          categoryList={eventCategories.readEventCategories}
        />
      </CustomContainer>
    </Box>
  )
};
