import { UserRole } from '@/data/graphql/types/graphql';
import type { ProfileBadgeModel } from '@/components/users/ProfileBadge';

type BuildProfileBadgesInput = {
  userRole?: UserRole | null;
};

export function buildProfileBadges({ userRole }: BuildProfileBadgesInput): ProfileBadgeModel[] {
  const badges: ProfileBadgeModel[] = [];

  if (userRole === UserRole.Admin) {
    badges.push({
      description: 'Admin badge. This account has Gatherle admin access.',
      icon: 'shield-star',
      label: 'Admin',
      tone: 'primary',
    });
  }

  if (userRole === UserRole.Host) {
    badges.push({
      description: 'Host badge. This account is recognized as an event host.',
      icon: 'lightning-bolt',
      label: 'Host',
      tone: 'secondary',
    });
  }

  return badges;
}
