'use client';

import { useState, SyntheticEvent, useMemo } from 'react';
import { Tabs, Tab, Box, Typography, Card, useTheme, useMediaQuery } from '@mui/material';
import { CustomTabPanel } from './CustomTabsPanel';

export type CustomTabItem = {
  name: string;
  content: React.ReactNode;
  icon?: React.ReactElement;
  description: string;
  disabled?: boolean;
};

export type CustomTabsProps = {
  tabsTitle: string;
  tabs: CustomTabItem[];
  defaultTab?: number;
  id?: string;
  variant?: 'scrollable' | 'standard' | 'fullWidth';
  orientation?: 'vertical' | 'horizontal';
  onTabChange?: (index: number) => void;
};

export default function CustomTabs({ tabsProps }: { tabsProps: CustomTabsProps }) {
  const {
    tabs,
    tabsTitle,
    defaultTab = 0,
    id = 'custom-tabs',
    variant = 'scrollable',
    orientation = 'vertical',
    onTabChange,
  } = tabsProps;

  const [value, setValue] = useState(defaultTab);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  // Use horizontal orientation on mobile for more content space
  const effectiveOrientation = isSmallScreen ? 'horizontal' : orientation;

  // Memoize tab panels to avoid unnecessary re-renders
  const tabPanels = useMemo(
    () =>
      tabs.map(({ content }, index) => (
        <CustomTabPanel key={`${id}-panel-content-${index}`} value={value} index={index} id={id}>
          {content}
        </CustomTabPanel>
      )),
    [tabs, value, id],
  );

  const handleChange = (_event: SyntheticEvent, newValue: number) => {
    setValue(newValue);
    if (onTabChange) {
      onTabChange(newValue);
    }
  };

  return (
    <Box
      role="region"
      aria-label={tabsTitle}
      sx={{
        display: 'flex',
        flexDirection: effectiveOrientation === 'vertical' ? 'row' : 'column',
        minHeight: { xs: 'auto', md: effectiveOrientation === 'vertical' ? '100vh' : 'auto' },
        gap: { xs: 2, md: 3 },
      }}
    >
      {/* Sidebar Navigation */}
      <Card
        elevation={0}
        sx={{
          borderRadius: { xs: 3, md: 3 },
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'background.paper',
          minHeight: effectiveOrientation === 'vertical' ? 'auto' : 'auto',
          position: effectiveOrientation === 'vertical' ? { md: 'sticky' } : 'static',
          top: effectiveOrientation === 'vertical' ? { md: 24 } : 'auto',
          alignSelf: 'flex-start',
          overflow: effectiveOrientation === 'horizontal' ? 'hidden' : 'visible',
          width: effectiveOrientation === 'horizontal' ? '100%' : 'auto',
          ...(effectiveOrientation === 'vertical' ? { minWidth: { xs: 'auto', md: 240 } } : {}),
        }}
      >
        {tabsTitle && !isSmallScreen && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 800, mt: 0.5 }}>
              {tabsTitle}
            </Typography>
          </Box>
        )}

        <Tabs
          orientation={effectiveOrientation}
          variant={variant}
          value={value}
          onChange={handleChange}
          aria-label={`${tabsTitle} tabs`}
          textColor="inherit"
          scrollButtons="auto"
          allowScrollButtonsMobile
          slotProps={{
            indicator: {
              style:
                effectiveOrientation === 'vertical'
                  ? { left: 0, width: 3, borderRadius: 4, backgroundColor: theme.palette.primary.main }
                  : { height: 0, display: 'none' },
            },
          }}
          sx={{
            p: effectiveOrientation === 'vertical' ? 1 : { xs: 1, sm: 0 },
            minHeight: effectiveOrientation === 'horizontal' ? 56 : 'auto',
            width: '100%',
            borderBottom: effectiveOrientation === 'horizontal' ? 'none' : 'unset',
            '& .MuiTabs-flexContainer': {
              width: effectiveOrientation === 'horizontal' ? 'max-content' : '100%',
            },
            '& .MuiTabs-scroller': {
              overflow: effectiveOrientation === 'horizontal' ? 'auto !important' : 'visible !important',
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            },
            '& .MuiTab-root': {
              minHeight: effectiveOrientation === 'vertical' ? 48 : 56,
              textAlign: effectiveOrientation === 'horizontal' ? 'center' : 'left',
              justifyContent: effectiveOrientation === 'horizontal' ? 'center' : 'flex-start',
              alignItems: 'center',
              borderRadius: effectiveOrientation === 'vertical' ? 2 : 0,
              mx: effectiveOrientation === 'vertical' ? 0.5 : 0,
              my: effectiveOrientation === 'vertical' ? 0.25 : 0,
              px: effectiveOrientation === 'horizontal' ? 2 : 2,
              color: 'text.secondary',
              fontWeight: 600,
              transition: 'all 0.2s ease',
              borderBottom: effectiveOrientation === 'horizontal' ? '2px solid transparent' : 'none',
              '&:hover': {
                backgroundColor: 'action.hover',
                color: 'text.primary',
                borderBottom: effectiveOrientation === 'horizontal' ? '2px solid' : 'none',
                borderColor: effectiveOrientation === 'horizontal' ? 'action.hover' : 'transparent',
              },
              '&.Mui-selected': {
                fontWeight: 700,
                color: 'primary.main',
                backgroundColor: effectiveOrientation === 'vertical' ? 'action.selected' : 'transparent',
                borderBottom: effectiveOrientation === 'horizontal' ? '2px solid' : 'none',
                borderColor: effectiveOrientation === 'horizontal' ? 'primary.main' : 'transparent',
              },
            },
            '& .MuiTab-icon': {
              marginRight: effectiveOrientation === 'vertical' ? '12px !important' : '0 !important',
              marginBottom: effectiveOrientation === 'horizontal' ? '4px !important' : '0 !important',
            },
          }}
        >
          {tabs.map(({ name, icon, disabled }, index) => (
            <Tab
              key={`${id}-tab-${index}`}
              id={`${id}-tab-${index}`}
              aria-controls={`${id}-panel-${index}`}
              label={
                <span
                  style={{
                    textTransform: 'none',
                    fontSize: effectiveOrientation === 'horizontal' ? '0.75rem' : '0.875rem',
                    lineHeight: 1.2,
                    whiteSpace: effectiveOrientation === 'horizontal' ? 'nowrap' : 'normal',
                  }}
                >
                  {name}
                </span>
              }
              icon={icon}
              iconPosition={effectiveOrientation === 'horizontal' ? 'top' : 'start'}
              disabled={disabled}
              sx={{
                opacity: disabled ? 0.5 : 1,
                px: effectiveOrientation === 'horizontal' ? 2 : 2,
                py: effectiveOrientation === 'vertical' ? 1.5 : undefined,
                minWidth: effectiveOrientation === 'horizontal' ? 'auto' : isSmallScreen ? 'auto' : undefined,
                flexShrink: effectiveOrientation === 'horizontal' ? 0 : 1,
              }}
            />
          ))}
        </Tabs>
      </Card>

      {/* Content Area */}
      <Card
        elevation={0}
        sx={{
          flex: 1,
          borderRadius: { xs: 3, md: 3 },
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          minHeight: { xs: 'auto', md: '100vh' },
        }}
      >
        {tabPanels}
      </Card>
    </Box>
  );
}
