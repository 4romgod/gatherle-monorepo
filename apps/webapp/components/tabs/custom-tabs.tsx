'use client';

import { useState, SyntheticEvent, useMemo } from 'react';
import { Tabs, Tab, Box, Typography, Tooltip, useTheme, useMediaQuery } from '@mui/material';
import { CustomTabPanel } from './custom-tabs-panel';

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
        <CustomTabPanel
          key={`${id}-panel-content-${index}`}
          value={value} index={index}
          id={id}
        >
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
        height: effectiveOrientation === 'vertical' ? '100%' : 'auto',
      }}
    >
      <Box
        sx={{
          borderBottom: effectiveOrientation === 'horizontal' ? 1 : 0,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'background.default',
          minHeight: effectiveOrientation === 'vertical' ? '100vh' : 'auto',
          ...(effectiveOrientation === 'vertical' ? { minWidth: isSmallScreen ? 'auto' : '200px' } : {}),
        }}
      >
        {tabsTitle && (
          <Typography
            variant="h6"
            component="h2"
            sx={{
              py: 4,
              px: 2,
              display: isSmallScreen ? 'none' : 'block',
            }}
          >
            {tabsTitle}
          </Typography>
        )}

        <Tabs
          orientation={effectiveOrientation}
          variant={variant}
          value={value}
          onChange={handleChange}
          aria-label={`${tabsTitle} tabs`}
          textColor="secondary"
          indicatorColor="secondary"
          slotProps={{
            indicator: {
              style: effectiveOrientation === 'vertical' ? { left: 0, width: 4 } : undefined,
            },
          }}
          sx={{
            height: effectiveOrientation === 'vertical' ? '100%' : 'auto',
            '& .MuiTab-root': {
              minHeight: effectiveOrientation === 'vertical' ? 48 : undefined,
              textAlign: effectiveOrientation === 'horizontal' ? 'center' : 'left',
              justifyContent: effectiveOrientation === 'horizontal' ? 'center' : 'flex-start',
              alignItems: 'center',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
              '&.Mui-selected': {
                fontWeight: 'bold',
              },
            },
            '& .MuiTab-icon': {
              marginRight: effectiveOrientation === 'vertical' ? '8px !important' : '0 !important',
              marginBottom: effectiveOrientation === 'horizontal' ? '4px !important' : '0 !important',
            },
          }}
        >
          {tabs.map(({ name, icon, description, disabled }, index) => (
            <Tooltip
              key={`${id}-tab-${index}`}
              title={description}
              placement={effectiveOrientation === 'vertical' ? 'right' : 'bottom'}
              arrow
            >
              <Tab
                id={`${id}-tab-${index}`}
                aria-controls={`${id}-panel-${index}`}
                label={
                  <span
                    style={{
                      textTransform: 'none',
                      fontSize: effectiveOrientation === 'horizontal' ? '0.75rem' : undefined,
                      lineHeight: 1,
                    }}
                  >
                    {name}
                  </span>}
                icon={icon}
                iconPosition={effectiveOrientation === 'horizontal' ? 'top' : 'start'}
                disabled={disabled}
                sx={{
                  opacity: disabled ? 0.5 : 1,
                  px: effectiveOrientation === 'horizontal' ? 2 : undefined,
                  py: effectiveOrientation === 'vertical' ? 1.5 : undefined,
                  minWidth: isSmallScreen ? 'auto' : undefined,
                }}
              />
            </Tooltip>
          ))}
        </Tabs>
      </Box>

      <Box
        sx={{
          py: 0,
          width: '100%',
          backgroundColor: 'background.paper',
        }}
      >
        {tabPanels}
      </Box>
    </Box>
  );
}
