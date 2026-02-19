import { alpha, Box, Button, Container, Grid, Stack, Typography } from '@mui/material';
import { Groups } from '@mui/icons-material';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getClient } from '@/data/graphql';
import {
  GetAllEventCategoryGroupsDocument,
  GetAllEventsDocument,
  GetEventCategoryBySlugDocument,
  GetEventCategoryBySlugQuery,
  GetAllEventsQuery,
  GetAllEventCategoryGroupsQuery,
} from '@/data/graphql/types/graphql';
import EventTileGrid from '@/components/events/EventTileGrid';
import { ROUTES } from '@/lib/constants';
import { getAuthHeader } from '@/lib/utils';
import { auth } from '@/auth';
import { getEventCategoryIcon } from '@/lib/constants';
import { CategoryExplorer } from '@/components/home';
import CategoryInterestToggleButton from '@/components/categories/CategoryInterestToggleButton';
import { isGraphQLErrorNotFound } from '@/lib/utils/error-utils';
import { buildPageMetadata } from '@/lib/metadata';

export const revalidate = 60;

type CategoryPageParams = {
  slug: string;
};

type CategoryPageProps = {
  params: Promise<CategoryPageParams>;
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const { data } = await getClient().query<GetEventCategoryBySlugQuery>({
      query: GetEventCategoryBySlugDocument,
      variables: { slug },
    });
    const category = data.readEventCategoryBySlug;

    if (category) {
      return buildPageMetadata({
        title: `${category.name} Events`,
        description:
          category.description ||
          `Explore upcoming ${category.name.toLowerCase()} events, communities, and related categories on Ntlango.`,
        keywords: [category.name, 'event category', 'discover events', 'community events'],
      });
    }
  } catch {
    // TODO: Fall through to fallback metadata
  }

  return buildPageMetadata({
    title: 'Category Events',
    description: 'Browse events by category and discover related interests on Ntlango.',
    keywords: ['event categories', 'discover events by interest'],
  });
}

export default async function CategoryDetailPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const client = getClient();
  const session = await auth();
  const authHeaders = getAuthHeader(session?.user?.token);

  let categoryData: GetEventCategoryBySlugQuery['readEventCategoryBySlug'] | null | undefined;
  let eventsData: GetAllEventsQuery['readEvents'] | null | undefined;
  let categoryGroupsData: GetAllEventCategoryGroupsQuery['readEventCategoryGroups'] | null | undefined;

  try {
    const [categoryResult, eventsResult, categoryGroupsResult] = await Promise.all([
      client.query<GetEventCategoryBySlugQuery>({
        query: GetEventCategoryBySlugDocument,
        variables: { slug },
      }),
      client.query<GetAllEventsQuery>({
        query: GetAllEventsDocument,
        variables: {
          options: {
            filters: [{ field: 'eventCategories.slug', value: slug }],
            pagination: { limit: 40 },
          },
        },
        context: { headers: authHeaders },
      }),
      client.query<GetAllEventCategoryGroupsQuery>({
        query: GetAllEventCategoryGroupsDocument,
      }),
    ]);

    categoryData = categoryResult.data.readEventCategoryBySlug;
    eventsData = eventsResult.data.readEvents;
    categoryGroupsData = categoryGroupsResult.data.readEventCategoryGroups;
  } catch (error: unknown) {
    if (isGraphQLErrorNotFound(error)) {
      notFound();
    }
    throw error;
  }

  const category = categoryData;
  if (!category) {
    notFound();
  }

  const events = eventsData ?? [];
  const interestedUsersCount = category.interestedUsersCount ?? 0;
  const formattedInterestedUsersCount = interestedUsersCount.toLocaleString();
  const IconComponent = getEventCategoryIcon(category.iconName);
  const categoryColor = category.color;
  const avatarBackground = categoryColor ? alpha(categoryColor, 0.15) : 'action.selected';
  const iconColor = categoryColor ?? 'text.primary';
  const categoryGroups = categoryGroupsData ?? [];
  const categoryGroup = categoryGroups.find((group) =>
    (group.eventCategories ?? []).some((eventCategory) => eventCategory.slug === slug),
  );
  const relatedCategories =
    categoryGroup?.eventCategories?.filter((relatedCategory) => relatedCategory.slug !== slug) ?? [];

  return (
    <Box component="section" sx={{ py: { xs: 6, md: 8 } }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ xs: 'stretch', md: 'flex-start' }}
            justifyContent="space-between"
            spacing={3}
          >
            <Stack spacing={3} sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={3}>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '16px',
                    backgroundColor: avatarBackground,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: iconColor,
                  }}
                >
                  <IconComponent width={26} height={26} />
                </Box>
                <Stack spacing={0.5}>
                  <Typography variant="overline" sx={{ letterSpacing: 4, color: 'text.secondary' }}>
                    EVENT CATEGORY
                  </Typography>
                  <Typography variant="h3" fontWeight={800}>
                    {category.name}
                  </Typography>
                </Stack>
              </Stack>

              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640 }}>
                {category.description ||
                  'Events curated for this interest will show up below. Subscribe or host your next event today.'}
              </Typography>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                sx={{ width: { xs: '100%', md: 'auto' } }}
              >
                <CategoryInterestToggleButton category={category} />
                <Button
                  href={ROUTES.CATEGORIES.ROOT}
                  variant="outlined"
                  sx={{ borderRadius: 10, textTransform: 'none', fontWeight: 600 }}
                >
                  Browse all categories
                </Button>
              </Stack>
            </Stack>

            <Box
              sx={{
                width: { xs: '100%', md: 300 },
                borderRadius: 3,
                border: '1px solid',
                borderColor: categoryColor ? alpha(categoryColor, 0.45) : 'divider',
                bgcolor: categoryColor ? alpha(categoryColor, 0.12) : 'background.paper',
                px: 3,
                py: 2.5,
              }}
            >
              <Typography variant="overline" sx={{ letterSpacing: 2, color: 'text.secondary' }}>
                COMMUNITY SIZE
              </Typography>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: categoryColor ? alpha(categoryColor, 0.2) : 'action.selected',
                  }}
                >
                  <Groups sx={{ color: categoryColor || 'primary.main', fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight={800} lineHeight={1}>
                    {formattedInterestedUsersCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {interestedUsersCount === 1 ? 'member' : 'members'}
                  </Typography>
                </Box>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                People currently following this category.
              </Typography>
            </Box>
          </Stack>

          <Stack spacing={2}>
            <Typography variant="subtitle1" fontWeight={600}>
              {events.length} Event{events.length === 1 ? '' : 's'} matching {category.name}
            </Typography>
            <EventTileGrid events={events} skeletonCount={3} />
          </Stack>
          {relatedCategories.length > 0 && (
            <Box sx={{ pt: 5 }}>
              <Typography variant="h6" fontWeight={700}>
                Related Categories
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {relatedCategories.length} related {relatedCategories.length === 1 ? 'category' : 'categories'}
              </Typography>
              <CategoryExplorer categories={relatedCategories} />
            </Box>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
