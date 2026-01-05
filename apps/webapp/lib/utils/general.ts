import { UserWithToken } from "@/data/graphql/types/graphql";

export const getAvatarSrc = (user: UserWithToken | undefined) => {
  if (!user) return undefined;
  return user.profile_picture ?? undefined;
};

export const getDisplayName = (user: UserWithToken | undefined) => {
  if (!user) return 'Account';
  return [user.given_name, user.family_name].filter(Boolean).join(' ');
};

