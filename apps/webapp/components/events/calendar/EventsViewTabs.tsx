'use client';

import { Tabs, Tab } from '@mui/material';
import type { EventsCalendarViewMode } from './calendar-utils';

interface EventsViewTabsProps {
  value: EventsCalendarViewMode;
  onChange: (value: EventsCalendarViewMode) => void;
}

const VIEW_TABS: Array<{ value: EventsCalendarViewMode; label: string }> = [
  { value: 'list', label: 'List' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

export default function EventsViewTabs({ value, onChange }: EventsViewTabsProps) {
  return (
    <Tabs
      value={value}
      onChange={(_, nextValue) => onChange(nextValue as EventsCalendarViewMode)}
      variant="scrollable"
      allowScrollButtonsMobile
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        minHeight: { xs: 42, md: 46 },
        '& .MuiTabs-indicator': {
          height: 2.5,
          borderRadius: 999,
          backgroundColor: 'primary.main',
        },
        '& .MuiTab-root': {
          minHeight: { xs: 42, md: 46 },
          minWidth: 88,
          px: { xs: 2, md: 2.5 },
          textTransform: 'none',
          fontWeight: 600,
          color: 'text.secondary',
          '&.Mui-selected': {
            color: 'primary.main',
          },
        },
      }}
    >
      {VIEW_TABS.map((tab) => (
        <Tab key={tab.value} value={tab.value} label={tab.label} />
      ))}
    </Tabs>
  );
}
