'use client';

import { useState, SyntheticEvent } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index } = props;

  return (
    <Box
      component="div"
      role="tabpanel"
      hidden={value !== index}
      id={`custom-tabpanel-${index}`}
      aria-labelledby={`custom-tab-${index}`}
    >
      {value === index && (
        <Box component="div" sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </Box>
  );
}

export type CustomTabsProps = {
  tabsTitle: string;
  tabs: {
    name: string;
    content: any;
    icon?: any;
  }[];
};

export default function CustomTabs({ tabsProps }: { tabsProps: CustomTabsProps }) {
  const [value, setValue] = useState(0);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const { tabs } = tabsProps;

  const handleChange = (event: SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ flexGrow: 1, display: 'flex' }}>
      <Tabs
        orientation="vertical"
        variant="scrollable"
        value={value}
        onChange={handleChange}
        textColor="secondary"
        indicatorColor="secondary"
        sx={{ borderRight: 1, borderColor: 'divider' }}
        TabIndicatorProps={{
          style: { left: 0, width: 4 },
        }}
      >
        {tabs.map(({ name, icon }, index) => (
          <Tab
            id={`custom-tab-${index}`}
            key={`tab-${name}`}
            label={isSmallScreen ? null : <p style={{ textTransform: 'none' }}>{name}</p>}
            icon={icon}
            iconPosition="start"
            aria-controls={`custom-tabpanel-${index}`}
            sx={{ justifyContent: 'flex-start' }}
          />
        ))}
      </Tabs>
      {tabs.map(({ name, content }, index) => (
        <TabPanel key={`tab-content-${name}`} value={value} index={index}>
          {content}
        </TabPanel>
      ))}
    </Box>
  );
}
