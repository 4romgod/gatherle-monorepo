import { Box, Container, Typography, Button } from '@mui/material';
import { People } from '@mui/icons-material';
import UsersPageClient from '@/components/users/UsersPageClient';
import { buildPageMetadata } from '@/lib/metadata';
import { ROUTES, APP_NAME } from '@/lib/constants';

export const metadata = buildPageMetadata({
  title: 'Community Members',
  description: `Discover people in the ${APP_NAME} community, follow profiles, and connect through shared interests.`,
  keywords: ['community', 'user profiles', 'follow creators', 'event community'],
});

export const revalidate = 120;

export default async function Page() {
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
              <People sx={{ fontSize: 20 }} />
              COMMUNITY
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
              Discover your community
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontSize: '1.125rem', lineHeight: 1.7 }}>
              Connect with event-goers, organizers, and creators. Follow people who share your interests and stay
              updated on what they&apos;re attending.
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
              <Button
                variant="outlined"
                size="large"
                href={ROUTES.ORGANIZATIONS.ROOT}
                sx={{
                  fontWeight: 600,
                  textTransform: 'none',
                  py: 1.5,
                  px: 4,
                  borderRadius: 2,
                  borderWidth: 2,
                  fontSize: '1rem',
                  '&:hover': {
                    borderWidth: 2,
                  },
                }}
              >
                View Organizations
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Users Grid */}
      <UsersPageClient />
    </Box>
  );
}
