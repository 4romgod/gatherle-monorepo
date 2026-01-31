import type { Metadata } from 'next';
import Link from 'next/link';
import { Button, Container, Stack, Typography } from '@mui/material';
import { auth } from '@/auth';
import { ROUTES } from '@/lib/constants';
import { UserRole } from '@/data/graphql/types/graphql';
import AdminDashboard from '@/components/admin/AdminDashboard';

export const metadata: Metadata = {
  title: 'Admin Console · Ntlango',
  description: 'Manage events, categories, groups, and users in one secure dashboard.',
};
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await auth();
  const isAdmin = session?.user?.userRole === UserRole.Admin;

  if (!session?.user || !isAdmin) {
    return (
      <Container sx={{ py: { xs: 8, md: 10 } }}>
        <Stack spacing={3} alignItems="center" textAlign="center">
          <Typography variant="h4" fontWeight={800}>
            Admin access required
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 560 }}>
            This section is restricted to administrators. If you believe you should have access, reach out to another
            admin. Otherwise, head back to the homepage.
          </Typography>
          <Button component={Link} href={ROUTES.HOME} variant="contained" color="secondary">
            Return home
          </Button>
        </Stack>
      </Container>
    );
  }

  return <AdminDashboard />;
}
