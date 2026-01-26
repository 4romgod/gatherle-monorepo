import { UserRole } from '@/data/graphql/types/graphql';
import { useSession } from 'next-auth/react';

export function useIsAdmin(): boolean {
  const { data: session } = useSession();
  return session?.user?.userRole === UserRole.Admin;
}
