'use client';

import { SyntheticEvent, useEffect, useMemo, useRef } from 'react';
import { Tabs, Tab, Box, Tooltip, Typography, Card, useTheme, useMediaQuery } from '@mui/material';
import { CustomTabPanel } from './CustomTabsPanel';
import { StorageType, usePersistentState } from '@/hooks/usePersistentState';

export type CustomTabItem = {
  name: string;
  content: React.ReactNode;
  icon?: React.ReactElement;
  description: string;
  disabled?: boolean;
};

export type TabPersistenceConfig = {
  key: string;
  namespace?: string;
  userId?: string;
  ttl?: number;
  storageType?: StorageType;
  syncToBackend?: boolean;
  token?: string;
};

export type CustomTabsProps = {
  tabsTitle: string;
  tabs: CustomTabItem[];
  defaultTab?: number;
  forceDefaultTab?: boolean;
  id?: string;
  layout?: 'default' | 'mobile';
  variant?: 'scrollable' | 'standard' | 'fullWidth';
  orientation?: 'vertical' | 'horizontal';
  onTabChange?: (index: number) => void;
  persistence?: TabPersistenceConfig;
};

export default function CustomTabs({ tabsProps }: { tabsProps: CustomTabsProps }) {
  const {
    tabs,
    tabsTitle,
    defaultTab = 0,
    forceDefaultTab = false,
    id = 'custom-tabs',
    layout = 'default',
    variant = 'scrollable',
    orientation = 'vertical',
    onTabChange,
    persistence,
  } = tabsProps;

  const persistenceKey = persistence?.key ?? `${id}-tab-index`;
  const { value, setValue, isHydrated } = usePersistentState<number>(persistenceKey, defaultTab, {
    namespace: persistence?.namespace,
    userId: persistence?.userId,
    storageType: persistence?.storageType,
    ttl: persistence?.ttl,
    disabled: !Boolean(persistence?.key),
    syncToBackend: persistence?.syncToBackend,
    token: persistence?.token,
  });
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const isXsScreen = useMediaQuery(theme.breakpoints.only('xs'));
  const isMobileLayout = layout === 'mobile';
  const previousDefaultSyncRef = useRef<{ defaultTab: number; forceDefaultTab: boolean } | null>(null);

  // Use default value during SSR and initial render to prevent hydration mismatch
  const displayValue = isHydrated ? value : defaultTab;

  useEffect(() => {
    const previousSync = previousDefaultSyncRef.current;
    const hasDefaultChanged = previousSync?.defaultTab !== defaultTab;
    const hasForceJustEnabled = forceDefaultTab && !previousSync?.forceDefaultTab;

    previousDefaultSyncRef.current = {
      defaultTab,
      forceDefaultTab,
    };

    if (!forceDefaultTab || !isHydrated || (!hasDefaultChanged && !hasForceJustEnabled) || value === defaultTab) {
      return;
    }

    setValue(defaultTab);
  }, [defaultTab, forceDefaultTab, isHydrated, setValue, value]);

  // Use horizontal orientation on mobile for more content space
  const effectiveOrientation = isMobileLayout ? 'horizontal' : isSmallScreen ? 'horizontal' : orientation;

  // Memoize tab panels to avoid unnecessary re-renders
  const tabPanels = useMemo(
    () =>
      tabs.map(({ content }, index) => (
        <CustomTabPanel key={`${id}-panel-content-${index}`} value={displayValue} index={index} id={id}>
          {content}
        </CustomTabPanel>
      )),
    [tabs, displayValue, id],
  );

  const handleChange = (_event: SyntheticEvent, newValue: number) => {
    setValue(newValue);
    if (onTabChange) {
      onTabChange(newValue);
    }
  };

  const canUseIconOnlyTabs = tabs.every(({ icon }) => Boolean(icon));
  const isCompactHorizontal =
    isXsScreen && effectiveOrientation === 'horizontal' && canUseIconOnlyTabs && !isMobileLayout;
  const isRegularHorizontal = !isXsScreen && effectiveOrientation === 'horizontal';

  function getTabPx(): number {
    return isCompactHorizontal ? 1.5 : 2;
  }

  function getTabMinWidth(): number | 'auto' | undefined {
    if (isCompactHorizontal) return 44;
    if (isRegularHorizontal) return 'auto';
    if (isSmallScreen) return 'auto';
    return undefined;
  }

  return (
    <Box
      role="region"
      aria-label={tabsTitle}
      sx={{
        display: 'flex',
        flexDirection: effectiveOrientation === 'vertical' ? 'row' : 'column',
        minHeight: { xs: 'auto', md: effectiveOrientation === 'vertical' ? '100vh' : 'auto' },
        gap: isMobileLayout ? 0 : { xs: 2, md: 3 },
      }}
    >
      {/* Sidebar Navigation */}
      <Card
        elevation={0}
        sx={{
          borderRadius: isMobileLayout ? 0 : { xs: 3, md: 3 },
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: isMobileLayout ? 'transparent' : 'background.default',
          backgroundImage: 'none',
          minHeight: effectiveOrientation === 'vertical' ? 'auto' : 'auto',
          position: effectiveOrientation === 'vertical' ? { md: 'sticky' } : 'static',
          top: effectiveOrientation === 'vertical' ? { md: 24 } : 'auto',
          alignSelf: 'flex-start',
          overflow: effectiveOrientation === 'horizontal' && !isMobileLayout ? 'hidden' : 'visible',
          width: effectiveOrientation === 'horizontal' ? '100%' : 'auto',
          ...(effectiveOrientation === 'vertical' ? { minWidth: { xs: 'auto', md: 240 } } : {}),
        }}
      >
        {tabsTitle && !isSmallScreen && !isMobileLayout && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 800, mt: 0.5 }}>
              {tabsTitle}
            </Typography>
          </Box>
        )}
        {tabsTitle && isSmallScreen && !isMobileLayout && (
          <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              {tabsTitle}
            </Typography>
          </Box>
        )}

        <Tabs
          orientation={effectiveOrientation}
          variant={variant}
          value={displayValue}
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
                  : isMobileLayout
                    ? { height: 2.5, borderRadius: 999, backgroundColor: theme.palette.primary.main }
                    : { height: 0, display: 'none' },
            },
          }}
          sx={{
            p: isMobileLayout ? 0 : effectiveOrientation === 'vertical' ? 1 : { xs: 1, sm: 0 },
            minHeight: effectiveOrientation === 'horizontal' ? 56 : 'auto',
            width: '100%',
            borderBottom: effectiveOrientation === 'horizontal' ? (isMobileLayout ? '1px solid' : 'none') : 'unset',
            borderColor: 'divider',
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
              borderRadius: effectiveOrientation === 'vertical' ? 1 : 0,
              mx: effectiveOrientation === 'vertical' ? 0.5 : 0,
              my: effectiveOrientation === 'vertical' ? 0.25 : 0,
              px: isMobileLayout ? 2.25 : effectiveOrientation === 'horizontal' ? 2 : 2,
              color: 'text.secondary',
              fontWeight: isMobileLayout ? 700 : 600,
              transition: 'all 0.2s ease',
              borderBottom: effectiveOrientation === 'horizontal' && !isMobileLayout ? '2px solid transparent' : 'none',
              minWidth: isMobileLayout ? 'auto' : undefined,
              '&:hover': {
                backgroundColor: isMobileLayout ? 'transparent' : 'action.hover',
                color: 'text.primary',
                borderBottom: effectiveOrientation === 'horizontal' && !isMobileLayout ? '2px solid' : 'none',
                borderColor: effectiveOrientation === 'horizontal' && !isMobileLayout ? 'action.hover' : 'transparent',
              },
              '&.Mui-selected': {
                fontWeight: 700,
                color: 'primary.main',
                backgroundColor:
                  effectiveOrientation === 'vertical' && !isMobileLayout ? 'action.selected' : 'transparent',
                borderBottom: effectiveOrientation === 'horizontal' && !isMobileLayout ? '2px solid' : 'none',
                borderColor: effectiveOrientation === 'horizontal' && !isMobileLayout ? 'primary.main' : 'transparent',
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
                // Icon-only on xs with horizontal orientation — saves space when many tabs
                isCompactHorizontal ? undefined : (
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
                )
              }
              icon={
                isCompactHorizontal ? (
                  // Wrap in Tooltip for accessibility when label is hidden
                  <Tooltip title={name} placement="top" disableTouchListener disableFocusListener>
                    <span style={{ display: 'flex' }}>{icon}</span>
                  </Tooltip>
                ) : (
                  icon
                )
              }
              iconPosition={effectiveOrientation === 'horizontal' ? 'top' : 'start'}
              // Provide an accessible name when the visible label is hidden (icon-only compact mode)
              aria-label={isCompactHorizontal ? name : undefined}
              disabled={disabled}
              sx={{
                opacity: disabled ? 0.5 : 1,
                px: getTabPx(),
                py: effectiveOrientation === 'vertical' ? 1.5 : undefined,
                minWidth: getTabMinWidth(),
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
          borderRadius: isMobileLayout ? 0 : { xs: 3, md: 3 },
          backgroundColor: isMobileLayout ? 'transparent' : 'background.default',
          backgroundImage: 'none',
          overflow: 'visible',
          minHeight: isMobileLayout ? 'auto' : { xs: 'auto', md: '100vh' },
        }}
      >
        {/* Mobile active tab title */}
        {!isMobileLayout && isSmallScreen && tabs[displayValue] && (
          <Box
            sx={{
              px: 3,
              pt: 2.5,
              pb: 1,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="subtitle1" fontWeight={700} color="primary.main">
              {tabs[displayValue].name}
            </Typography>
            {tabs[displayValue].description && (
              <Typography variant="caption" color="text.secondary">
                {tabs[displayValue].description}
              </Typography>
            )}
          </Box>
        )}
        {tabPanels}
      </Card>
    </Box>
  );
}
