import { Box, Container } from '@mui/material';
import { getClient } from '@/data/graphql';
import { GetEventCategoryGroupsDocument } from '@/data/graphql/types/graphql';
import type { EventCategoryGroup } from '@/data/graphql/types/graphql';
import CategoriesClient from '@/components/categories/CategoriesClient';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata = buildPageMetadata({
  title: 'Event Categories',
  description: 'Explore curated event categories to quickly find music, business, wellness, arts, and more.',
  keywords: ['event categories', 'discover events by interest', 'music events', 'community events'],
});

export const revalidate = 60;

export default async function CategoriesPage() {
  const { data } = await getClient().query({
    query: GetEventCategoryGroupsDocument,
  });

  const groups: EventCategoryGroup[] = data?.readEventCategoryGroups ?? [];

  return (
    <Box>
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <CategoriesClient groups={groups} />
      </Container>
    </Box>
  );
}
