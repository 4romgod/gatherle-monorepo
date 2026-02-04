import { UserWithToken, User } from '@/data/graphql/types/graphql';

export const getAvatarSrc = (user: UserWithToken | User | undefined) => {
  if (!user) return undefined;
  return user.profile_picture ?? undefined;
};

export const getDisplayName = (user: UserWithToken | User | undefined) => {
  if (!user) return 'Account';
  return [user.given_name, user.family_name].filter(Boolean).join(' ');
};

export const getFileExtension = (file: File) => {
  return file.name.split('.').pop()?.toLowerCase() || '';
};
