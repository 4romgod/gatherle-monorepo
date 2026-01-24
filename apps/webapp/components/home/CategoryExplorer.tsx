import { Box, Container, Typography, Stack, Skeleton } from '@mui/material';
import EventCategoryCard from '@/components/events/category/EventCategoryCard';
import { SECTION_TITLE_STYLES } from '@/lib/constants';
import { EventCategory } from '@/data/graphql/types/graphql';

interface CategoryExplorerProps {
  categories?: EventCategory[];
  isLoading?: boolean;
}

export default function CategoryExplorer({ categories = [], isLoading = false }: CategoryExplorerProps) {
  const shouldRender = isLoading || categories.length > 0;
  if (!shouldRender) {
    return null;
  }

  const skeletonCount = 6;

  return (
    <Box
      id="explore-categories"
      sx={{
        backgroundColor: 'background.default',
        py: { xs: 5, md: 7 },
      }}
    >
      <Container>
        {isLoading ? (
          <>
            <Skeleton variant="text" width={260} height={34} sx={{ ...SECTION_TITLE_STYLES, mb: 1, mx: 'auto' }} />
            <Skeleton variant="text" width={280} height={20} sx={{ mb: 4, mx: 'auto' }} />
          </>
        ) : (
          <>
            <Typography
              variant="h4"
              sx={{
                ...SECTION_TITLE_STYLES,
                mb: 1,
                textAlign: 'center',
                fontSize: { xs: '1.5rem', md: '2rem' },
              }}
            >
              Choose your kind of magic
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
              Discover spaces built for music lovers, builders, founders, foodies, and everyone in between.
            </Typography>
          </>
        )}

        <Box
          sx={{
            overflowX: 'auto',
            width: '100%',
            pb: 1,
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE/Edge
            '&::-webkit-scrollbar': { display: 'none' }, // Chrome/Safari
          }}
        >
          <Stack direction="row" spacing={2} sx={{ minWidth: 0 }}>
            {isLoading
              ? Array.from({ length: skeletonCount }).map((_, index) => (
                  <Box key={`category-skeleton-${index}`} sx={{ minWidth: 120, flex: '0 0 auto' }}>
                    <Skeleton
                      variant="rounded"
                      width="100%"
                      height={110}
                      sx={{ borderRadius: 3, bgcolor: 'action.selected' }}
                    />
                  </Box>
                ))
              : categories.map((category, index) => (
                  <Box key={index} sx={{ minWidth: 120, flex: '0 0 auto' }}>
                    <EventCategoryCard eventCategory={category} />
                  </Box>
                ))}
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
