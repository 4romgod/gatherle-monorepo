/**
 * Example: Using Elevation Zero Design Tokens
 * 
 * This file demonstrates how to use the standardized design tokens
 * from the Elevation Zero Design System in your components.
 */

import { Box, Button, Card, CardContent, Container, Grid, Stack, Typography, Chip } from '@mui/material';
import { Add as AddIcon, EventNote as EventIcon } from '@mui/icons-material';
import {
  CARD_STYLES,
  INTERACTIVE_CARD_STYLES,
  BUTTON_PRIMARY_STYLES,
  HERO_SECTION_STYLES,
  COVER_HERO_STYLES,
  HERO_GRADIENT_OVERLAY_STYLES,
  HERO_TITLE_STYLES,
  OVERLINE_LABEL_STYLES,
  PAGE_TITLE_STYLES,
  SECTION_TITLE_STYLES,
  EMPTY_STATE_STYLES,
  EMPTY_STATE_ICON_STYLES,
  STICKY_SIDEBAR_STYLES,
  CHIP_STYLES,
  SPACING,
  GRID_COLUMNS,
} from '@/lib/constants/design-tokens';

/**
 * Example 1: Simple Card Component
 */
export function ExampleCard() {
  return (
    <Card sx={CARD_STYLES}>
      <CardContent>
        <Typography variant="h6" sx={SECTION_TITLE_STYLES}>
          Card Title
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Card content goes here
        </Typography>
      </CardContent>
    </Card>
  );
}

/**
 * Example 2: Interactive Card with Hover
 */
export function ExampleInteractiveCard() {
  return (
    <Card
      component="a"
      href="/details"
      sx={{
        ...INTERACTIVE_CARD_STYLES,
        textDecoration: 'none', // Remove link underline
      }}
    >
      <CardContent>
        <Typography variant="h6" sx={SECTION_TITLE_STYLES}>
          Clickable Card
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Hover over this card to see the effect
        </Typography>
      </CardContent>
    </Card>
  );
}

/**
 * Example 3: Page Hero Section
 */
export function ExamplePageHero() {
  return (
    <Box sx={HERO_SECTION_STYLES}>
      <Container>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
            }}
          >
            <EventIcon sx={{ fontSize: 32 }} />
          </Box>
        </Stack>
        <Typography variant="overline" sx={OVERLINE_LABEL_STYLES}>
          EVENTS
        </Typography>
        <Typography variant="h3" sx={PAGE_TITLE_STYLES}>
          Discover Events
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Find and join events happening in your area
        </Typography>
      </Container>
    </Box>
  );
}

/**
 * Example 4: Cover Hero with Image
 */
export function ExampleCoverHero() {
  return (
    <Box sx={COVER_HERO_STYLES}>
      <Box
        component="img"
        src="https://images.unsplash.com/photo-1540575467063-178a50c2df87"
        alt="Event cover"
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      <Box sx={HERO_GRADIENT_OVERLAY_STYLES} />
      <Container
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 2,
          pb: SPACING.standard,
        }}
      >
        <Typography variant="h3" sx={HERO_TITLE_STYLES}>
          Event Title Goes Here
        </Typography>
      </Container>
    </Box>
  );
}

/**
 * Example 5: Primary CTA Button
 */
export function ExampleButton() {
  return (
    <Button variant="contained" size="large" startIcon={<AddIcon />} sx={BUTTON_PRIMARY_STYLES}>
      Create Event
    </Button>
  );
}

/**
 * Example 6: Empty State
 */
export function ExampleEmptyState() {
  return (
    <Box sx={EMPTY_STATE_STYLES}>
      <Box sx={EMPTY_STATE_ICON_STYLES}>
        <EventIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
      </Box>
      <Typography variant="h6" sx={SECTION_TITLE_STYLES}>
        No Events Found
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
        You haven't created any events yet. Get started by creating your first event.
      </Typography>
      <Button variant="contained" startIcon={<AddIcon />} sx={{ ...BUTTON_PRIMARY_STYLES, mt: 2 }}>
        Create Event
      </Button>
    </Box>
  );
}

/**
 * Example 7: 2-Column Layout (Main + Sidebar)
 */
export function ExampleTwoColumnLayout() {
  return (
    <Container sx={{ mt: SPACING.relaxed }}>
      <Grid container spacing={SPACING.standard}>
        {/* Main Content */}
        <Grid size={GRID_COLUMNS.mainColumn}>
          <Stack spacing={SPACING.standard}>
            <Card sx={CARD_STYLES}>
              <CardContent>
                <Typography variant="h6" sx={SECTION_TITLE_STYLES}>
                  Main Content
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Sidebar */}
        <Grid size={GRID_COLUMNS.sidebarColumn}>
          <Box sx={STICKY_SIDEBAR_STYLES}>
            <Card sx={CARD_STYLES}>
              <CardContent>
                <Typography variant="h6" sx={SECTION_TITLE_STYLES}>
                  Sidebar
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

/**
 * Example 8: Grid of Cards
 */
export function ExampleCardGrid() {
  const items = [1, 2, 3, 4, 5, 6];

  return (
    <Container sx={{ py: SPACING.relaxed }}>
      <Grid container spacing={SPACING.standard}>
        {items.map(item => (
          <Grid key={item} size={GRID_COLUMNS.threeColumn}>
            <Card sx={INTERACTIVE_CARD_STYLES}>
              <CardContent>
                <Typography variant="h6" sx={SECTION_TITLE_STYLES}>
                  Item {item}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Card description
                </Typography>
                <Chip label="Category" size="small" sx={{ ...CHIP_STYLES, mt: 2 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

/**
 * Example 9: Using Spacing Constants
 */
export function ExampleSpacing() {
  return (
    <Stack spacing={SPACING.standard}>
      <Box sx={{ mb: SPACING.compact }}>Compact margin bottom (16px)</Box>
      <Box sx={{ p: SPACING.standard }}>Standard padding (24px)</Box>
      <Box sx={{ py: SPACING.relaxed }}>Relaxed vertical padding (32px)</Box>
    </Stack>
  );
}

/**
 * Quick Reference:
 * 
 * Import what you need:
 * ```tsx
 * import { CARD_STYLES, BUTTON_PRIMARY_STYLES, SPACING } from '@/lib/constants/design-tokens';
 * ```
 * 
 * Use in sx prop:
 * ```tsx
 * <Card sx={CARD_STYLES}>...</Card>
 * <Button sx={BUTTON_PRIMARY_STYLES}>Click</Button>
 * <Stack spacing={SPACING.standard}>...</Stack>
 * ```
 * 
 * Extend with custom styles:
 * ```tsx
 * <Card sx={{ ...CARD_STYLES, bgcolor: 'primary.light' }}>...</Card>
 * ```
 * 
 * Combine multiple tokens:
 * ```tsx
 * <Button sx={{ ...BUTTON_PRIMARY_STYLES, mt: SPACING.compact }}>...</Button>
 * ```
 */
