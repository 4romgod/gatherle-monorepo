import { SocialVisibility } from '@/data/graphql/types/graphql';

export interface UserVisibilityContext {
  viewerId?: string;
  userId?: string;
  defaultVisibility?: SocialVisibility | null;
  followingIds?: Set<string>;
}

export const canViewUserDetails = ({
  viewerId,
  userId,
  defaultVisibility,
  followingIds,
}: UserVisibilityContext): boolean => {
  if (!userId) {
    return false;
  }

  if (viewerId && userId === viewerId) {
    return true;
  }

  const visibility = defaultVisibility ?? SocialVisibility.Public;
  if (visibility === SocialVisibility.Public) {
    return true;
  }

  return Boolean(followingIds?.has(userId));
};

export const getVisibilityLabel = (visibility?: SocialVisibility | null): string => {
  switch (visibility) {
    case SocialVisibility.Private:
      return 'Private profile';
    case SocialVisibility.Followers:
      return 'Followers only';
    default:
      return 'Public profile';
  }
};
