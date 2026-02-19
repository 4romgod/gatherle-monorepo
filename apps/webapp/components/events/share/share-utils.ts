import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';

export interface EventShareButtonProps {
  eventTitle: string;
  eventSlug?: string;
  eventUrl?: string;
  size?: 'small' | 'medium' | 'large';
  ariaLabel?: string;
  stopPropagation?: boolean;
  sx?: import('@mui/material').SxProps<import('@mui/material').Theme>;
}

export type ShareUser = {
  userId: string;
  username?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  profile_picture?: string | null;
};

export interface PlatformAction {
  key: string;
  label: string;
  icon?: IconType;
  muiIcon?: ReactNode;
  bgColor: string;
  fgColor: string;
  onClick: () => void;
}

export const USER_SEARCH_FIELDS = ['username', 'email', 'given_name', 'family_name'];
export const SEARCH_DEBOUNCE_MS = 220;

export const getDisplayName = (user: ShareUser): string => {
  const fullName = [user.given_name, user.family_name].filter(Boolean).join(' ').trim();
  return fullName || user.username || 'Unknown';
};

export const getInitial = (user: ShareUser): string =>
  (user.given_name?.charAt(0) ?? user.family_name?.charAt(0) ?? user.username?.charAt(0) ?? '?').toUpperCase();

export const launchExternalShare = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};
