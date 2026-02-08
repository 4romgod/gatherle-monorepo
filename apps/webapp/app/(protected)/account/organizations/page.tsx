import { Box, Button, Container, Grid, Typography } from '@mui/material';
import { Add, Business } from '@mui/icons-material';
import { auth } from '@/auth';
import { getClient } from '@/data/graphql';
import { GetOrganizationMembershipsByOrgIdDocument } from '@/data/graphql/query/OrganizationMembership/query';
import { GetAllOrganizationsDocument } from '@/data/graphql/query/Organization/query';
import { ROUTES } from '@/lib/constants';
import OrganizationCard from '@/components/organization/organizationBox';
import { Organization, OrganizationMembership } from '@/data/graphql/types/graphql';
import LinkComponent from '@/components/navigation/LinkComponent';

export default async function AccountOrganizationsPage() {
  const session = await auth();
  if (!session) {
    return null;
  }

  // TODO: Consider implementing a dedicated backend query that returns only the organizations where the user is a member or owner, using a single database query with proper indexing.
  const { data: allOrgsData } = await getClient().query({
    query: GetAllOrganizationsDocument,
  });

  const allOrganizations = allOrgsData.readOrganizations ?? [];

  // Filter organizations where user is owner or member
  const userOrganizations: Array<{ org: Organization; membership?: OrganizationMembership }> = [];

  for (const org of allOrganizations) {
    if (org.ownerId === session.user.userId) {
      // User is owner, fetch membership to get role
      try {
        const { data: membershipsData } = await getClient().query({
          query: GetOrganizationMembershipsByOrgIdDocument as any,
          variables: { orgId: org.orgId },
        });

        const userMembership = membershipsData.readOrganizationMembershipsByOrgId.find(
          (m: OrganizationMembership) => m.userId === session.user.userId,
        );

        userOrganizations.push({
          org,
          membership: userMembership,
        });
      } catch (error) {
        // If membership fetch fails, still include org
        userOrganizations.push({ org });
      }
    } else {
      // Check if user is a member
      try {
        const { data: membershipsData } = await getClient().query({
          query: GetOrganizationMembershipsByOrgIdDocument as any,
          variables: { orgId: org.orgId },
        });

        const userMembership = membershipsData.readOrganizationMembershipsByOrgId.find(
          (m: OrganizationMembership) => m.userId === session.user.userId,
        );

        if (userMembership) {
          userOrganizations.push({
            org,
            membership: userMembership,
          });
        }
      } catch {
        // User not a member, skip
      }
    }
  }

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
              component={LinkComponent}
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
            {userOrganizations.map(({ org, membership }) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={org.orgId}>
                <OrganizationCard organization={org} userRole={membership?.role} />
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
              component={LinkComponent}
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
