# Gatherle Design System: "Elevation Zero"

## Overview

The **Elevation Zero Design System** is Gatherle's visual language - a modern, clean, and accessible design approach
that emphasizes flat surfaces with subtle borders over heavy shadows. This system prioritizes readability, mobile-first
responsiveness, and consistent user experiences across all pages.

### Philosophy

- **Clarity over decoration** - Let content shine, reduce visual noise
- **Borders over shadows** - Use subtle borders (divider color) instead of elevation shadows
- **Theme-driven colors** - Never hardcode colors, always reference theme palette
- **Consistent spacing** - 8px base grid, predictable gaps and padding
- **Mobile-first** - Design for small screens, enhance for larger viewports

---

## 1. Card System

### Standard Card Pattern

All cards use this baseline configuration:

```tsx
<Card
  elevation={0}
  sx={{
    borderRadius: 3,
    border: '1px solid',
    borderColor: 'divider',
    p: { xs: 3, md: 4 },
  }}
>
  <CardContent>{/* Content */}</CardContent>
</Card>
```

**Key Properties:**

- `elevation={0}` - No shadow, flat design
- `borderRadius: 3` - 24px rounded corners (theme.spacing(3))
- `border: '1px solid', borderColor: 'divider'` - Subtle border from theme
- `p: { xs: 3, md: 4 }` - Responsive padding (24px mobile, 32px desktop)

### Interactive Card (with hover)

```tsx
<Card
  elevation={0}
  sx={{
    borderRadius: 3,
    border: '1px solid',
    borderColor: 'divider',
    transition: 'all 0.2s ease-in-out',
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-2px)',
      borderColor: 'primary.main',
      boxShadow: (theme) => theme.shadows[4],
    },
  }}
>
  {/* Content */}
</Card>
```

**Hover States:**

- `transform: 'translateY(-2px)'` - Subtle lift effect
- `borderColor: 'primary.main'` - Border changes to primary color
- `boxShadow: theme.shadows[4]` - Light shadow appears on hover
- `transition: 'all 0.2s ease-in-out'` - Smooth animation

---

## 2. Hero Sections

### Page Hero (with background)

Used for top-level pages (Organizations, Venues, Events list):

```tsx
<Box
  sx={{
    bgcolor: 'background.paper',
    borderBottom: '1px solid',
    borderColor: 'divider',
    py: { xs: 6, md: 8 },
  }}
>
  <Container>
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IconComponent sx={{ fontSize: 32 }} />
      </Box>
    </Stack>
    <Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: '0.1em' }}>
      SECTION LABEL
    </Typography>
    <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' } }}>
      Page Title
    </Typography>
    <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
      Description text
    </Typography>
  </Container>
</Box>
```

**Key Properties:**

- Height: `py: { xs: 6, md: 8 }` (48px-64px responsive)
- Border: `borderBottom: '1px solid', borderColor: 'divider'`
- Icon box: 32px icon, `borderRadius: 2`, primary background
- Typography hierarchy: overline → h3 → body1

### Cover Hero (for detail pages)

Used for detail pages (Events, Organizations, User profiles):

```tsx
<Box
  sx={{
    position: 'relative',
    height: { xs: 280, sm: 340, md: 380 },
    width: '100%',
    overflow: 'hidden',
  }}
>
  <Box
    component="img"
    src={coverImage}
    alt={title}
    sx={{
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: 'center',
    }}
  />
  {/* Gradient overlay */}
  <Box
    sx={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '45%',
      background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
    }}
  />
  {/* Title overlay */}
  <Container
    sx={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 2,
      pb: 3,
    }}
  >
    <Typography
      variant="h3"
      fontWeight={800}
      sx={{
        color: 'common.white',
        fontSize: { xs: '1.625rem', sm: '2rem', md: '2.5rem' },
        textShadow: '0 2px 20px rgba(0,0,0,0.5)',
      }}
    >
      {title}
    </Typography>
  </Container>
</Box>
```

**Key Properties:**

- Height: `{ xs: 280, sm: 340, md: 380 }` (responsive)
- Gradient: Bottom 45% with `linear-gradient` for text readability
- Title: White text with `textShadow`, responsive font sizes
- Image: `objectFit: 'cover'`, `objectPosition: 'center'`

### Avatar Overlay (for user/org profiles)

Add to cover hero for profile pages:

```tsx
<Container
  sx={{
    position: 'absolute',
    bottom: -40,
    left: 0,
    right: 0,
    zIndex: 2,
    display: 'flex',
    justifyContent: 'center',
  }}
>
  <Avatar
    src={profileImage}
    sx={{
      width: { xs: 80, sm: 100, md: 120 },
      height: { xs: 80, sm: 100, md: 120 },
      border: '4px solid',
      borderColor: 'common.white',
      boxShadow: (theme) => theme.shadows[8],
    }}
  >
    {initials}
  </Avatar>
</Container>
```

**Key Properties:**

- Position: `bottom: -40` (overlaps hero and content)
- Size: Responsive `{ xs: 80, sm: 100, md: 120 }`
- Border: 4px white border for contrast
- Shadow: `theme.shadows[8]` for depth

---

## 3. Typography Hierarchy

### Heading Patterns

**Page Title (Hero)**

```tsx
<Typography variant="overline" color="primary" fontWeight={700} sx={{ letterSpacing: '0.1em' }}>
  SECTION LABEL
</Typography>
<Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' } }}>
  Main Title
</Typography>
```

**Card Section Title**

```tsx
<Typography variant="overline" color="text.secondary" fontWeight={600} sx={{ letterSpacing: '0.1em' }}>
  SECTION LABEL
</Typography>
<Typography variant="h6" fontWeight={700} sx={{ mt: 2, mb: 1 }}>
  Section Title
</Typography>
```

**Subsection Title**

```tsx
<Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
  LABEL
</Typography>
<Typography variant="body2" fontWeight={600}>
  Value or content
</Typography>
```

### Font Weights

- **800** - Hero titles (h3), primary page headings
- **700** - Card titles (h6), section headings, overline labels, CTAs
- **600** - Captions, labels, button text
- **500** - Medium emphasis body text (chips, metadata)
- **400** - Default body text

### Responsive Font Sizes

```tsx
// Large title
fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' }

// Medium title
fontSize: { xs: '1.375rem', sm: '1.5rem', md: '1.75rem' }

// Small title
fontSize: { xs: '1.125rem', sm: '1.25rem', md: '1.5rem' }
```

---

## 4. Button System

### Primary CTA Button

```tsx
<Button
  variant="contained"
  size="large"
  sx={{
    fontWeight: 600,
    textTransform: 'none',
    borderRadius: 2,
    px: 4,
    py: 1.5,
  }}
>
  Action Text
</Button>
```

### Secondary/Outlined Button

```tsx
<Button
  variant="outlined"
  size="large"
  sx={{
    fontWeight: 600,
    textTransform: 'none',
    borderRadius: 2,
    px: 3,
    py: 1.25,
  }}
>
  Action Text
</Button>
```

### Text/Ghost Button

```tsx
<Button
  variant="text"
  sx={{
    fontWeight: 600,
    textTransform: 'none',
    borderRadius: 2,
    px: 2,
  }}
>
  Action Text
</Button>
```

### Icon Button with Text

```tsx
<Button
  variant="contained"
  startIcon={<IconComponent />}
  sx={{
    fontWeight: 600,
    textTransform: 'none',
    borderRadius: 2,
  }}
>
  Action Text
</Button>
```

**Button Standards:**

- `textTransform: 'none'` - Preserve case (not all-caps)
- `fontWeight: 600` - Semi-bold for emphasis
- `borderRadius: 2` - 16px rounded corners
- Sizes: small (py: 0.75), medium (py: 1.25), large (py: 1.5)

---

## 5. Layout Grid System

### 2-Column Layout (Main + Sidebar)

```tsx
<Container sx={{ mt: 4 }}>
  <Grid container spacing={3}>
    {/* Main content - 8 columns on desktop */}
    <Grid size={{ xs: 12, md: 8 }}>
      <Stack spacing={3}>{/* Cards */}</Stack>
    </Grid>

    {/* Sidebar - 4 columns on desktop */}
    <Grid size={{ xs: 12, md: 4 }}>
      <Box sx={{ position: { md: 'sticky' }, top: 24 }}>{/* Sidebar content */}</Box>
    </Grid>
  </Grid>
</Container>
```

**Key Properties:**

- Spacing: `spacing={3}` (24px gap)
- Sticky sidebar: `position: { md: 'sticky' }, top: 24`
- Full width mobile: `xs: 12`
- Split desktop: `md: 8` and `md: 4`

### Grid of Cards

```tsx
<Grid container spacing={3}>
  {items.map((item) => (
    <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4 }}>
      <Card>{/* Card content */}</Card>
    </Grid>
  ))}
</Grid>
```

**Responsive Grid:**

- Mobile: 1 column (`xs: 12`)
- Tablet: 2 columns (`sm: 6`)
- Desktop: 3 columns (`md: 4`)

---

## 6. Spacing System

### Container Spacing

```tsx
<Container maxWidth="lg" sx={{ py: 4 }}>
  {/* Content */}
</Container>
```

### Card Spacing

```tsx
<Stack spacing={3}>
  <Card sx={{ p: { xs: 3, md: 4 } }}>{/* Card content */}</Card>
</Stack>
```

### Section Spacing

```tsx
<Box sx={{ mb: 3 }}>
  <Typography variant="h6" sx={{ mb: 2 }}>
    Title
  </Typography>
  <Typography variant="body2">Content</Typography>
</Box>
```

**Spacing Scale:**

- `spacing={1}` - 8px (tight spacing)
- `spacing={2}` - 16px (compact spacing)
- `spacing={3}` - 24px (default spacing) **← Most common**
- `spacing={4}` - 32px (relaxed spacing)
- `spacing={6}` - 48px (section spacing)
- `spacing={8}` - 64px (page section spacing)

---

## 7. Color System

### Theme Colors (Always Use These)

```tsx
// Primary palette
'primary.main'; // Main brand color
'primary.light'; // Lighter shade
'primary.dark'; // Darker shade
'primary.contrastText'; // Text on primary background

// Secondary palette
'secondary.main';
'secondary.light';
'secondary.dark';
'secondary.contrastText';

// Background
'background.default'; // Page background
'background.paper'; // Card/surface background

// Text
'text.primary'; // Main text color
'text.secondary'; // Muted text
'text.disabled'; // Disabled state text

// Borders & dividers
'divider'; // Border color

// Common
'common.white'; // Pure white (overlays)
'common.black'; // Pure black (overlays)

// Status colors
'success.main';
'error.main';
'warning.main';
'info.main';
```

**Never Hardcode Colors:** ❌ Bad: `color: '#1976d2'`  
✅ Good: `color: 'primary.main'`

❌ Bad: `bgcolor: 'white'`  
✅ Good: `bgcolor: 'background.paper'`

---

## 8. Empty States

### Standard Empty State

```tsx
<Box
  sx={{
    py: 8,
    px: 3,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  }}
>
  <Box
    sx={{
      p: 3,
      borderRadius: '50%',
      bgcolor: 'action.hover',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <EmptyIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
  </Box>
  <Typography variant="h6" fontWeight={700}>
    No Items Found
  </Typography>
  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
    Description of why it's empty and what users can do.
  </Typography>
  <Button variant="contained" startIcon={<AddIcon />} sx={{ mt: 2 }}>
    Create New Item
  </Button>
</Box>
```

**Key Properties:**

- Icon: 48px in circular background with `action.hover` bgcolor
- Title: h6, fontWeight 700
- Description: body2, text.secondary, maxWidth 400px
- CTA button: Prominent contained button

---

## 9. Chips & Tags

### Standard Chip

```tsx
<Chip label="Category Name" size="small" sx={{ fontWeight: 500 }} />
```

### Chip with Icon

```tsx
<Chip icon={<IconComponent />} label="Label" size="small" sx={{ fontWeight: 500 }} />
```

### Chip with Avatar

```tsx
<Chip avatar={<Avatar src={image}>{initial}</Avatar>} label="User Name" size="small" variant="outlined" />
```

**Chip Standards:**

- Size: `small` (default), `medium` (emphasis)
- Font: `fontWeight: 500`
- Variants: `filled` (default), `outlined` (less emphasis)

---

## 10. Hover & Interaction States

### Card Hover

```tsx
'&:hover': {
  transform: 'translateY(-2px)',
  borderColor: 'primary.main',
  boxShadow: (theme) => theme.shadows[4],
}
```

### Link Hover

```tsx
'&:hover': {
  color: 'primary.main',
  textDecoration: 'underline',
}
```

### Button Hover (default MUI behavior is good)

- No custom hover needed, MUI handles it
- Optional: `'&:hover': { transform: 'scale(1.02)' }`

**Interaction Standards:**

- Transitions: `transition: 'all 0.2s ease-in-out'`
- Lift: `transform: 'translateY(-2px)'` (cards)
- Scale: `transform: 'scale(1.02)'` (small items)
- Color shift: Change `borderColor` or `color` to `primary.main`

---

## 11. Responsive Breakpoints

### MUI Breakpoints

```tsx
theme.breakpoints.values = {
  xs: 0, // Mobile (320px+)
  sm: 600, // Large mobile / Small tablet
  md: 900, // Tablet
  lg: 1200, // Desktop
  xl: 1536, // Large desktop
};
```

### Common Responsive Patterns

**Padding:**

```tsx
p: { xs: 3, md: 4 }  // 24px mobile, 32px desktop
py: { xs: 6, md: 8 } // 48px mobile, 64px desktop
```

**Font Size:**

```tsx
fontSize: { xs: '1.75rem', md: '2.5rem' }
```

**Grid Columns:**

```tsx
size={{ xs: 12, sm: 6, md: 4 }} // 1, 2, 3 columns
```

**Display:**

```tsx
display: { xs: 'none', md: 'block' } // Hide on mobile
```

**Sticky Positioning:**

```tsx
position: {
  md: 'sticky';
} // Only sticky on desktop
```

---

## 12. Accessibility Standards

### Semantic HTML

```tsx
<Box component="main">      {/* Use main for main content */}
<Box component="nav">       {/* Use nav for navigation */}
<Box component="article">   {/* Use article for content blocks */}
<Box component="section">   {/* Use section for page sections */}
```

### ARIA Labels

```tsx
<Button aria-label="Close dialog">
  <CloseIcon />
</Button>

<TextField
  label="Email"
  aria-describedby="email-helper"
/>
<FormHelperText id="email-helper">
  We'll never share your email
</FormHelperText>
```

### Focus States

- Always visible: Never `outline: none` without replacement
- Use `:focus-visible` for keyboard-only focus
- Ensure 3px focus ring with sufficient contrast

### Alt Text

```tsx
<Box component="img" src={image} alt="Descriptive text" />
<Avatar alt="User full name" src={avatar} />
```

---

## 13. Component Checklist

When creating or updating any component, ensure:

- [ ] Uses `elevation={0}` for cards
- [ ] Uses `borderRadius: 3` for cards, `borderRadius: 2` for buttons
- [ ] Uses `border: '1px solid', borderColor: 'divider'` for borders
- [ ] Never hardcodes colors (always uses theme palette)
- [ ] Uses `fontWeight: 700-800` for headings, `600` for buttons
- [ ] Uses `textTransform: 'none'` for buttons
- [ ] Uses `spacing={3}` for Stack/Grid gaps
- [ ] Uses `p: { xs: 3, md: 4 }` for card padding
- [ ] Implements hover states for interactive elements
- [ ] Responsive with `xs`, `md` breakpoints at minimum
- [ ] Semantic HTML (`component="main"`, `component="nav"`, etc.)
- [ ] Proper ARIA labels for icons and actions
- [ ] Proper TypeScript interfaces for props

---

## 14. File Organization

### Component File Structure

```
components/
├── events/
│   ├── card.tsx              # EventCard component
│   ├── hero.tsx              # EventHero component
│   ├── empty-state.tsx       # EventEmptyState component
│   └── index.ts              # Barrel export
```

### Barrel Exports

```tsx
// components/events/index.ts
export { default as EventCard } from './card';
export { default as EventHero } from './hero';
export { default as EventEmptyState } from './empty-state';
```

---

## Quick Reference

### Most Common Patterns

**Card:**

```tsx
elevation={0}, borderRadius: 3, border: '1px solid', borderColor: 'divider', p: { xs: 3, md: 4 }
```

**Button:**

```tsx
fontWeight: 600, textTransform: 'none', borderRadius: 2
```

**Spacing:**

```tsx
spacing={3}, gap={3}, p: 3, py: 4, mb: 2
```

**Typography:**

```tsx
variant="h6", fontWeight={700}, color="text.secondary"
```

**Hover:**

```tsx
'&:hover': { transform: 'translateY(-2px)', borderColor: 'primary.main' }
```

---

**This design system is living documentation. Update as patterns evolve.**
