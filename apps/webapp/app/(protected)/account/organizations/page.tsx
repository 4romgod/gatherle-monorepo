import { Box, Button, Container, Grid, Typography } from '@mui/material';
import { Add, Business } from '@mui/icons-material';
import { auth } from '@/auth';
import { getClient } from '@/data/graphql';
import { GetMyOrganizationsDocument } from '@/data/graphql/query/Organization/query';
import { ROUTES } from '@/lib/constants';
import { getAuthHeader } from '@/lib/utils/auth';
import OrganizationCard from '@/components/organization/organizationBox';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/metadata';
import { redirect } from 'next/navigation';

export const metadata: Metadata = buildPageMetadata({
  title: 'My Organizations',
  description: 'Manage the organizations you own or belong to and collaborate with your team.',
  noIndex: true,
});

export default async function AccountOrganizationsPage() {
  const session = await auth();
  if (!session?.user?.token) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  const { data } = await getClient().query({
    query: GetMyOrganizationsDocument,
    context: { headers: getAuthHeader(session.user.token) },
  });

  const userOrganizations = data.readMyOrganizations ?? [];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: { xs: 6, md: 8 },
        }}
      >
        <Container>
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
              <Business sx={{ fontSize: 20 }} />
              MY ORGANIZATIONS
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
              Your organizations
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontSize: '1.125rem', lineHeight: 1.7 }}>
              Manage organizations you own or are a member of. Create new organizations, edit details, and manage team
              members.
            </Typography>
            <Button
              variant="contained"
              size="large"
              href={ROUTES.ACCOUNT.ORGANIZATIONS.CREATE}
              startIcon={<Add />}
              sx={{
                fontWeight: 700,
                textTransform: 'none',
                py: 1.5,
                px: 4,
                borderRadius: 2,
                fontSize: '1rem',
              }}
            >
              Create Organization
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Organizations Grid */}
      <Container sx={{ py: 6 }}>
        {userOrganizations.length > 0 ? (
          <Grid container spacing={3}>
            {userOrganizations.map(({ organization, role }) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={organization.orgId}>
                <OrganizationCard organization={organization} userRole={role} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box
            sx={{
              textAlign: 'center',
              py: 12,
            }}
          >
            <Business sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={600} gutterBottom>
              No organizations yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first organization to start hosting events as a team
            </Typography>
            <Button
              variant="contained"
              href={ROUTES.ACCOUNT.ORGANIZATIONS.CREATE}
              startIcon={<Add />}
              sx={{
                fontWeight: 600,
                textTransform: 'none',
                px: 3,
              }}
            >
              Create Organization
            </Button>
          </Box>
        )}
      </Container>
    </Box>
  );
}
