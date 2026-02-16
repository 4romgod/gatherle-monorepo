import { useSession } from 'next-auth/react';
import { getAuthHeader } from '@/lib/utils';

export const useFollowAuthToken = (): string | undefined => {
  const { data: session } = useSession();
  return session?.user?.token;
};

export const getFollowAuthContext = (token?: string) => {
  return {
    context: {
      headers: getAuthHeader(token),
    },
  };
};
