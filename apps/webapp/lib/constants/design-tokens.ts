/**
 * Elevation Zero Design System Tokens
 *
 * Reusable style objects following the Elevation Zero Design System.
 * See /docs/webapp/design-system.md for full documentation.
 */

import { SxProps, Theme } from '@mui/material';

/**
 * Standard card styling - elevation zero with border
 */
export const CARD_STYLES: SxProps<Theme> = {
  elevation: 0,
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  p: { xs: 3, md: 4 },
};

/**
 * Interactive card with hover effects
 */
export const INTERACTIVE_CARD_STYLES: SxProps<Theme> = {
  ...CARD_STYLES,
  transition: 'all 0.2s ease-in-out',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-2px)',
    borderColor: 'primary.main',
    boxShadow: (theme: Theme) => theme.shadows[4],
  },
};

/**
 * Compact card styling (less padding)
 */
export const CARD_COMPACT_STYLES: SxProps<Theme> = {
  elevation: 0,
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  p: 3,
};

/**
 * Button base styles
 */
export const BUTTON_STYLES: SxProps<Theme> = {
  fontWeight: 600,
  textTransform: 'none',
  borderRadius: 2,
};

/**
 * Primary CTA button styles
 */
export const BUTTON_PRIMARY_STYLES: SxProps<Theme> = {
  ...BUTTON_STYLES,
  px: 4,
  py: 1.5,
};

/**
 * Page hero section background
 */
export const HERO_SECTION_STYLES: SxProps<Theme> = {
  bgcolor: 'background.paper',
  borderBottom: '1px solid',
  borderColor: 'divider',
  py: { xs: 6, md: 8 },
};

/**
 * Cover hero image container
 */
export const COVER_HERO_STYLES: SxProps<Theme> = {
  position: 'relative',
  height: { xs: 280, sm: 340, md: 380 },
  width: '100%',
  overflow: 'hidden',
};

/**
 * Hero gradient overlay (bottom)
 */
export const HERO_GRADIENT_OVERLAY_STYLES: SxProps<Theme> = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: '45%',
  background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
  pointerEvents: 'none',
};

/**
 * Hero title text (white with shadow)
 */
export const HERO_TITLE_STYLES: SxProps<Theme> = {
  color: 'common.white',
  fontSize: { xs: '1.625rem', sm: '2rem', md: '2.5rem' },
  fontWeight: 800,
  textShadow: '0 2px 20px rgba(0,0,0,0.5)',
  lineHeight: 1.2,
};

/**
 * Section overline label
 */
export const OVERLINE_LABEL_STYLES: SxProps<Theme> = {
  letterSpacing: '0.1em',
  fontWeight: 700,
  color: 'primary.main',
};

/**
 * Page title (h3)
 */
export const PAGE_TITLE_STYLES: SxProps<Theme> = {
  fontWeight: 800,
  fontSize: { xs: '1.75rem', md: '2.5rem' },
};

/**
 * Section title (h6)
 */
export const SECTION_TITLE_STYLES: SxProps<Theme> = {
  fontWeight: 700,
};

/**
 * Empty state container
 */
export const EMPTY_STATE_STYLES: SxProps<Theme> = {
  py: 8,
  px: 3,
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2,
};

/**
 * Empty state icon wrapper
 */
export const EMPTY_STATE_ICON_STYLES: SxProps<Theme> = {
  p: 3,
  borderRadius: '50%',
  bgcolor: 'action.hover',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

/**
 * Sticky sidebar positioning
 */
export const STICKY_SIDEBAR_STYLES: SxProps<Theme> = {
  position: { md: 'sticky' },
  top: 24,
};

/**
 * Profile avatar overlay (on cover image)
 */
export const AVATAR_OVERLAY_STYLES: SxProps<Theme> = {
  width: { xs: 80, sm: 100, md: 120 },
  height: { xs: 80, sm: 100, md: 120 },
  border: '4px solid',
  borderColor: 'common.white',
  boxShadow: (theme: Theme) => theme.shadows[8],
};

/**
 * Chip standard styling
 */
export const CHIP_STYLES: SxProps<Theme> = {
  fontWeight: 500,
};

/**
 * Paper form container
 */
export const FORM_PAPER_STYLES: SxProps<Theme> = {
  elevation: 0,
  p: { xs: 3, md: 4 },
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
};

/**
 * Standard spacing values (most commonly used)
 */
export const SPACING = {
  /** 8px - Tight spacing */
  tight: 1,
  /** 16px - Compact spacing */
  compact: 2,
  /** 24px - Default/standard spacing (most common) */
  standard: 3,
  /** 32px - Relaxed spacing */
  relaxed: 4,
  /** 48px - Section spacing */
  section: 6,
  /** 64px - Page section spacing */
  page: 8,
} as const;

/**
 * Grid column configurations
 */
export const GRID_COLUMNS = {
  /** Full width on mobile, half on tablet, third on desktop */
  threeColumn: { xs: 12, sm: 6, md: 4 },
  /** Full width on mobile, half on tablet+ */
  twoColumn: { xs: 12, sm: 6 },
  /** Main content column (2-column layout) */
  mainColumn: { xs: 12, md: 8 },
  /** Sidebar column (2-column layout) */
  sidebarColumn: { xs: 12, md: 4 },
  /** Full width */
  fullWidth: { xs: 12 },
} as const;
