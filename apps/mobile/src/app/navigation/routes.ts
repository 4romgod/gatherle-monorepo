import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Events:
    | {
        initialEventId?: string;
        initialSearch?: string;
      }
    | undefined;
  Moments: undefined;
  Messages: undefined;
  Notifications: undefined;
  Account: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Categories: undefined;
  Community: undefined;
  Organizations: undefined;
  Venues: undefined;
  OrganizationDetails: {
    orgId: string;
    orgName?: string;
  };
  VenueDetails: {
    venueId: string;
    venueName?: string;
  };
  UserProfile: {
    userId: string;
    username?: string | null;
    displayName?: string;
    avatarUrl?: string | null;
  };
  EventDetails: {
    occurrence: MobileEventOccurrence;
  };
  MessageThread: {
    avatarUrl?: string | null;
    displayName: string;
    username?: string | null;
    withUserId: string;
  };
  Profile: undefined;
  Settings: undefined;
  MyEvents: undefined;
  CreateEvent: undefined;
  MyOrganizations: undefined;
  Admin: undefined;
  Login:
    | {
        redirectTab?: keyof MainTabParamList;
      }
    | undefined;
  EmailLogin:
    | {
        redirectTab?: keyof MainTabParamList;
      }
    | undefined;
  Register:
    | {
        redirectTab?: keyof MainTabParamList;
      }
    | undefined;
  ForgotPassword:
    | {
        redirectTab?: keyof MainTabParamList;
      }
    | undefined;
  ResetPassword:
    | {
        token?: string;
        redirectTab?: keyof MainTabParamList;
      }
    | undefined;
  VerifyEmail:
    | {
        token?: string;
        redirectTab?: keyof MainTabParamList;
      }
    | undefined;
  VerifyPending:
    | {
        email?: string;
        redirectTab?: keyof MainTabParamList;
      }
    | undefined;
};

export type TabRouteName = keyof MainTabParamList;
export type DetailRouteName = Exclude<keyof RootStackParamList, 'MainTabs'>;

type ScreenContent = {
  sectionLabel: string;
  title: string;
  description: string;
};

type DetailScreenContent = ScreenContent & {
  category: 'discover' | 'social' | 'account' | 'auth';
};

export const tabScreenContent: Record<TabRouteName, ScreenContent> = {
  Home: {
    sectionLabel: 'Mobile Shell',
    title: 'Gatherle in your pocket',
    description:
      'The native home will anchor discovery, social touchpoints, and account entry from one mobile-first hub.',
  },
  Events: {
    sectionLabel: 'Discover',
    title: 'Events',
    description: 'This tab is reserved for the mobile event feed, filters, and RSVP journey that mirrors the webapp.',
  },
  Moments: {
    sectionLabel: 'Live',
    title: 'Moments',
    description:
      'A full-screen vertical moments feed lives here, blending followed activity, local events, and live discovery.',
  },
  Messages: {
    sectionLabel: 'Social',
    title: 'Messages',
    description:
      'Direct conversations, thread previews, and real-time chat hooks will land here once the shell is in place.',
  },
  Notifications: {
    sectionLabel: 'Updates',
    title: 'Notifications',
    description:
      'In-app alerts, follow activity, reminders, and messaging nudges will be surfaced in this mobile inbox.',
  },
  Account: {
    sectionLabel: 'Account',
    title: 'Your account',
    description: 'Profile, settings, your content, and the auth entry points are grouped here for the first app pass.',
  },
};

export const detailScreenContent: Record<DetailRouteName, DetailScreenContent> = {
  Categories: {
    sectionLabel: 'Discover',
    title: 'Categories',
    description:
      'A mobile category explorer belongs here, including interest toggles and fast jumps into relevant events.',
    category: 'discover',
  },
  Community: {
    sectionLabel: 'Social',
    title: 'Community',
    description:
      'This screen is reserved for user discovery, follow relationships, and the broader community view on mobile.',
    category: 'social',
  },
  Organizations: {
    sectionLabel: 'Communities',
    title: 'Organizations',
    description: 'This screen will house organization discovery, follow state, and community-level event funnels.',
    category: 'discover',
  },
  Venues: {
    sectionLabel: 'Places',
    title: 'Venues',
    description: 'Venue discovery, nearby spots, and location-specific event browsing will live on this route.',
    category: 'discover',
  },
  OrganizationDetails: {
    sectionLabel: 'Communities',
    title: 'Organization details',
    description: 'This route holds the public organization story, follower state, and hosted events on mobile.',
    category: 'discover',
  },
  VenueDetails: {
    sectionLabel: 'Places',
    title: 'Venue details',
    description: 'This route holds venue context, maps actions, and events happening at that location.',
    category: 'discover',
  },
  UserProfile: {
    sectionLabel: 'Social',
    title: 'User profile',
    description: 'This route shows a public member profile with follow, message, and visible activity surfaces.',
    category: 'social',
  },
  EventDetails: {
    sectionLabel: 'Discover',
    title: 'Event details',
    description: 'This screen holds the mobile event story, including schedule, host, attendance, and actions.',
    category: 'discover',
  },
  MessageThread: {
    sectionLabel: 'Social',
    title: 'Conversation',
    description: 'Direct message history and the mobile chat composer live on this conversation route.',
    category: 'social',
  },
  Profile: {
    sectionLabel: 'Identity',
    title: 'Edit profile',
    description: 'Your public identity, bio, handle, and location controls live on this editing surface.',
    category: 'social',
  },
  Settings: {
    sectionLabel: 'Controls',
    title: 'Settings',
    description: 'Theme, personal preferences, notification options, and future session settings will be grouped here.',
    category: 'account',
  },
  MyEvents: {
    sectionLabel: 'Creator',
    title: 'My events',
    description: 'Hosted events, saved drafts, and future event management actions will be reachable from this screen.',
    category: 'account',
  },
  CreateEvent: {
    sectionLabel: 'Creator',
    title: 'Create event',
    description:
      'The mobile create-event flow, draft state, and step-based publishing UX will eventually be implemented here.',
    category: 'account',
  },
  MyOrganizations: {
    sectionLabel: 'Creator',
    title: 'My organizations',
    description: 'This route is reserved for the user’s owned organizations and membership management tools.',
    category: 'account',
  },
  Admin: {
    sectionLabel: 'Operations',
    title: 'Admin',
    description: 'The mobile app may need a trimmed-down admin surface for oversight, moderation, and diagnostics.',
    category: 'account',
  },
  Login: {
    sectionLabel: 'Auth',
    title: 'Login',
    description: 'Choose an authentication provider before continuing into the signed-in mobile experience.',
    category: 'auth',
  },
  EmailLogin: {
    sectionLabel: 'Auth',
    title: 'Email login',
    description: 'Email/password entry for users choosing the credentials provider on mobile.',
    category: 'auth',
  },
  Register: {
    sectionLabel: 'Auth',
    title: 'Register',
    description: 'Account creation, onboarding prompts, and social sign-up variants will be scaffolded here.',
    category: 'auth',
  },
  ForgotPassword: {
    sectionLabel: 'Auth',
    title: 'Forgot password',
    description: 'Password reset requests and recovery guidance belong on this support-oriented auth page.',
    category: 'auth',
  },
  ResetPassword: {
    sectionLabel: 'Auth',
    title: 'Reset password',
    description: 'The actual password reset confirmation flow will be implemented on this mobile route.',
    category: 'auth',
  },
  VerifyEmail: {
    sectionLabel: 'Auth',
    title: 'Verify email',
    description: 'Email verification state, retry actions, and success handling will be surfaced on this page.',
    category: 'auth',
  },
  VerifyPending: {
    sectionLabel: 'Auth',
    title: 'Verify pending',
    description:
      'This holding screen will explain that email verification is still pending and what the user can do next.',
    category: 'auth',
  },
};

export const tabRouteNames = Object.keys(tabScreenContent) as TabRouteName[];
export const detailRouteNames = Object.keys(detailScreenContent) as DetailRouteName[];

export const authRouteNames: DetailRouteName[] = [
  'Login',
  'EmailLogin',
  'Register',
  'ForgotPassword',
  'ResetPassword',
  'VerifyEmail',
  'VerifyPending',
];
