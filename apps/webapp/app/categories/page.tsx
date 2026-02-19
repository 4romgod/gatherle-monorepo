import { Box, Container, Typography, Button } from '@mui/material';
import { Category } from '@mui/icons-material';
import { getClient } from '@/data/graphql';
import { GetAllEventCategoryGroupsDocument } from '@/data/graphql/types/graphql';
import type { EventCategoryGroup } from '@/data/graphql/types/graphql';
import CategoriesClient from '@/components/categories/CategoriesClient';
import { buildPageMetadata } from '@/lib/metadata';
import { ROUTES } from '@/lib/constants';

export const metadata = buildPageMetadata({
  title: 'Event Categories',
  description: 'Explore curated event categories to quickly find music, business, wellness, arts, and more.',
  keywords: ['event categories', 'discover events by interest', 'music events', 'community events'],
});

export const revalidate = 60;

export default async function CategoriesPage() {
  const { data } = await getClient().query({
    query: GetAllEventCategoryGroupsDocument,
  });

  const groups: EventCategoryGroup[] = data?.readEventCategoryGroups ?? [];
  const totalCategories = groups.reduce((count, group) => count + (group.eventCategories?.length ?? 0), 0);

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          py: { xs: 6, md: 8 },
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ maxWidth: '800px' }}>
            <Typography
              variant="overline"
              sx={{
                color: 'primary.main',
                fontWeight: 700,
                fontSize: '0.875rem',
                letterSpacing: '0.1em',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 2,
              }}
            >
              <Category sx={{ fontSize: 20 }} />
              CATEGORIES
            </Typography>
            <Typography
              variant="h3"
              fontWeight={800}
              sx={{
                mb: 2,
                fontSize: { xs: '2rem', md: '2.5rem' },
                lineHeight: 1.2,
              }}
            >
              Discover events by category
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1, fontSize: '1.125rem', lineHeight: 1.7 }}>
              Browse curated event categories grouped by the types of experiences people love. Tap a category to see
              every upcoming event that matches that interest.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, fontWeight: 600 }}>
              {groups.length} category groups · {totalCategories} categories
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                href={ROUTES.EVENTS.ROOT}
                sx={{
                  fontWeight: 700,
                  textTransform: 'none',
                  py: 1.5,
                  px: 4,
                  borderRadius: 2,
                  fontSize: '1rem',
                }}
              >
                Browse Events
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Categories Grid */}
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <CategoriesClient groups={groups} />
      </Container>
    </Box>
  );
}
