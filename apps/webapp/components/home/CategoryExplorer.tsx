import { Box, Container, Typography, Stack, Skeleton } from '@mui/material';
import EventCategoryCard from '@/components/categories/CategoryCardSm';
import { SECTION_TITLE_STYLES } from '@/lib/constants';
import { EventCategory } from '@/data/graphql/types/graphql';

interface CategoryExplorerProps {
  categories?: EventCategory[];
  isLoading?: boolean;
  title?: string;
  description?: string;
}

export default function CategoryExplorer({
  categories = [],
  isLoading = false,
  title,
  description,
}: CategoryExplorerProps) {
  const showSkeletons = isLoading && categories.length === 0;
  const shouldRender = showSkeletons || categories.length > 0;
  if (!shouldRender) {
    return null;
  }

  const skeletonCount = 10;

  return (
    <Box
      id="explore-categories"
      sx={{
        backgroundColor: 'background.default',
        py: { xs: 5, md: 7 },
      }}
    >
      <Container>
        <>
          {title && (
            <Typography
              variant="h4"
              sx={{
                ...SECTION_TITLE_STYLES,
                mb: 1,
                textAlign: 'center',
                fontSize: { xs: '1.5rem', md: '2rem' },
              }}
            >
              {title}
            </Typography>
          )}
          {description && (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
              {description}
            </Typography>
          )}
        </>

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
          <Stack direction="row" spacing={{ xs: 1.25, sm: 1.5, md: 2 }} sx={{ minWidth: 0 }}>
            {showSkeletons
              ? Array.from({ length: skeletonCount }).map((_, index) => (
                  <Box
                    key={`category-skeleton-${index}`}
                    sx={{ minWidth: { xs: 92, sm: 104, md: 120 }, flex: '0 0 auto' }}
                  >
                    <Skeleton
                      variant="rounded"
                      width="100%"
                      sx={{
                        borderRadius: { xs: 2.25, md: 3 },
                        bgcolor: 'action.selected',
                        height: { xs: 86, sm: 96, md: 110 },
                      }}
                    />
                  </Box>
                ))
              : categories.map((category, index) => (
                  <Box key={index} sx={{ minWidth: { xs: 92, sm: 104, md: 120 }, flex: '0 0 auto' }}>
                    <EventCategoryCard eventCategory={category} />
                  </Box>
                ))}
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
