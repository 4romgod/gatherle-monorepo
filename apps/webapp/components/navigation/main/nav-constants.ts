import { Event, Business, Place, People } from '@mui/icons-material';
import { ROUTES } from '@/lib/constants';

export const NAV_LINKS = [
  { label: 'Events', href: ROUTES.EVENTS.ROOT, icon: Event },
  { label: 'Organizations', href: ROUTES.ORGANIZATIONS.ROOT, icon: Business },
  { label: 'Venues', href: ROUTES.VENUES.ROOT, icon: Place },
  { label: 'Community', href: ROUTES.USERS.ROOT, icon: People },
];

export default NAV_LINKS;
