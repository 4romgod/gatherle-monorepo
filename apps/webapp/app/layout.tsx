import { auth } from '@/auth';
import RootLayout from '@/layouts/root-layout';

export default async function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <RootLayout session={session}>
      {children}
    </RootLayout>
  );
}
