import * as HeroIcons from '@heroicons/react/24/solid';
import { Event, Business, Place, People } from '@mui/icons-material';
import { ROUTES } from './routes';

export type EventCategoryIconComponents = {
  [key: string]: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement> & React.RefAttributes<SVGSVGElement>>;
};

export const EVENT_CATEGORY_ICON_MAPPING: EventCategoryIconComponents = {
  PaintBrushIcon: HeroIcons.PaintBrushIcon,
  MusicalNoteIcon: HeroIcons.MusicalNoteIcon,
  CpuChipIcon: HeroIcons.CpuChipIcon,
  HeartIcon: HeroIcons.HeartIcon,
  DumbbellIcon: HeroIcons.PlusCircleIcon,
  CakeIcon: HeroIcons.CakeIcon,
  WineGlassIcon: HeroIcons.AdjustmentsVerticalIcon,
  GlobeAmericasIcon: HeroIcons.GlobeAmericasIcon,
  MusicIcon: HeroIcons.MusicalNoteIcon,
  PresentationChartBarIcon: HeroIcons.PresentationChartBarIcon,
  UserGroupIcon: HeroIcons.UserGroupIcon,
};

export const getEventCategoryIcon = (iconName: string) => {
  return EVENT_CATEGORY_ICON_MAPPING[iconName] ?? EVENT_CATEGORY_ICON_MAPPING.UserGroupIcon;
};

export const NAV_LINKS = [
  { label: 'Events', href: ROUTES.EVENTS.ROOT, icon: Event },
  { label: 'Organizations', href: ROUTES.ORGANIZATIONS.ROOT, icon: Business },
  { label: 'Venues', href: ROUTES.VENUES.ROOT, icon: Place },
  { label: 'Community', href: ROUTES.USERS.ROOT, icon: People },
];
