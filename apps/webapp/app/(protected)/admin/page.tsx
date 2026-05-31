import type { Metadata } from 'next';
import { Button, Card, CardContent, Container, Stack, Typography } from '@mui/material';
import { auth } from '@/auth';
import { ROUTES, APP_NAME } from '@/lib/constants';
import { UserRole } from '@/data/graphql/types/graphql';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { ADMIN_SURFACE_SX } from '@/components/admin/admin-ui';
import { buildPageMetadata } from '@/lib/metadata';
import { redirect } from 'next/navigation';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin Console',
  description: `Manage categories, users, groups, and operational workflows for the ${APP_NAME} platform.`,
  noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.token) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  const isAdmin = session?.user?.userRole === UserRole.Admin;

  if (!isAdmin) {
    return (
      <Container sx={{ py: { xs: 8, md: 10 } }}>
        <Card elevation={0} sx={{ ...ADMIN_SURFACE_SX, maxWidth: 640, mx: 'auto' }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={3} alignItems="center" textAlign="center">
              <Typography variant="h4" fontWeight={800}>
                Admin access required
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 560 }}>
                This section is restricted to administrators. If you believe you should have access, reach out to
                another admin. Otherwise, head back to the homepage.
              </Typography>
              <Button href={ROUTES.HOME} variant="contained" color="secondary">
                Return home
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return <AdminDashboard token={session.user.token} currentUserId={session.user.userId} />;
}
