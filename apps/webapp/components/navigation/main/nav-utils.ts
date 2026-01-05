export const getAvatarSrc = (user: any) => {
  if (!user) return undefined;
  return user.image ?? user.profile_picture ?? user.picture ?? undefined;
};

export const getDisplayName = (user: any) => {
  if (!user) return 'Account';
  if (user.name && typeof user.name === 'string' && user.name.trim().includes(' ')) return user.name;

  const given = user.given_name ?? user.firstName ?? user.givenName;
  const family = user.family_name ?? user.lastName ?? user.familyName;
  const combined = [given, family].filter(Boolean).join(' ');
  if (combined) return combined;

  return user.name ?? 'Account';
};
