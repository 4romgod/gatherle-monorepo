import * as HeroIcons from '@heroicons/react/24/solid';
import { Event, Business, Place, People, Category, PlayCircle } from '@mui/icons-material';
import { ROUTES } from './routes';

// Re-export lightweight app-identity constants from their own bundle-safe module.
export {
  APP_NAME,
  COMPANY_LEGAL_NAME,
  APP_DOMAIN,
  APP_LOGO_DARK_PATH,
  APP_LOGO_LIGHT_PATH,
  APP_LOGO_PATH,
  APP_NAMESPACE,
} from './app';

// Synced from @gatherle/commons/lib/constants/general.ts
export const IMPORTED_EVENT_SYSTEM_USERNAME = 'gatherle-imports';

export type EventCategoryIconComponents = {
  [key: string]: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement> & React.RefAttributes<SVGSVGElement>>;
};

export const EVENT_CATEGORY_ICON_MAPPING: EventCategoryIconComponents = {
  AcademicCapIcon: HeroIcons.AcademicCapIcon,
  BriefcaseIcon: HeroIcons.BriefcaseIcon,
  PaintBrushIcon: HeroIcons.PaintBrushIcon,
  MusicalNoteIcon: HeroIcons.MusicalNoteIcon,
  CpuChipIcon: HeroIcons.CpuChipIcon,
  HeartIcon: HeroIcons.HeartIcon,
  DumbbellIcon: HeroIcons.PlusCircleIcon,
  CakeIcon: HeroIcons.CakeIcon,
  HandRaisedIcon: HeroIcons.HandRaisedIcon,
  SparklesIcon: HeroIcons.SparklesIcon,
  TrophyIcon: HeroIcons.TrophyIcon,
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
  { label: 'Moments', href: ROUTES.MOMENTS.ROOT, icon: PlayCircle },
  { label: 'Categories', href: ROUTES.CATEGORIES.ROOT, icon: Category },
  { label: 'Organizations', href: ROUTES.ORGANIZATIONS.ROOT, icon: Business },
  { label: 'Venues', href: ROUTES.VENUES.ROOT, icon: Place },
  { label: 'Community', href: ROUTES.USERS.ROOT, icon: People },
];
