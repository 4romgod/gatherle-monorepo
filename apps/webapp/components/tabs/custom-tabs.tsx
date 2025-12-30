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
        flexDirection: orientation === 'vertical' ? 'row' : 'column',
        height: orientation === 'vertical' ? '100%' : 'auto',
      }}
    >
      <Box
        sx={{
          borderBottom: orientation === 'horizontal' ? 1 : 0,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'background.default',
          minHeight: '100vh',
          ...(orientation === 'vertical' ? { minWidth: isSmallScreen ? 'auto' : '200px' } : {}),
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
          orientation={orientation}
          variant={variant}
          value={value}
          onChange={handleChange}
          aria-label={`${tabsTitle} tabs`}
          textColor="secondary"
          indicatorColor="secondary"
          slotProps={{
            indicator: {
              style: orientation === 'vertical' ? { left: 0, width: 4 } : undefined,
            },
          }}
          sx={{
            height: orientation === 'vertical' ? '100%' : 'auto',
            '& .MuiTab-root': {
              minHeight: orientation === 'vertical' ? 48 : undefined,
              textAlign: 'left',
              justifyContent: 'flex-start',
              alignItems: 'center',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
              '&.Mui-selected': {
                fontWeight: 'bold',
              },
            },
          }}
        >
          {tabs.map(({ name, icon, description, disabled }, index) => (
            <Tooltip
              key={`${id}-tab-${index}`}
              title={description}
              placement={orientation === 'vertical' ? 'right' : 'bottom'}
              arrow
            >
              <Tab
                id={`${id}-tab-${index}`}
                aria-controls={`${id}-panel-${index}`}
                label={isSmallScreen ? null : <span style={{ textTransform: 'none' }}>{name}</span>}
                icon={icon}
                iconPosition="start"
                disabled={disabled}
                sx={{
                  minWidth: isSmallScreen ? 'auto' : undefined,
                  opacity: disabled ? 0.5 : 1,
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
