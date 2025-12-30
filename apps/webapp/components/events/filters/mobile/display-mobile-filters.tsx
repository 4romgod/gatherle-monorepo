'use client';

import React, { useState, useEffect } from 'react';
import { Drawer, Button, styled, Box, Typography, Theme, useMediaQuery } from '@mui/material';
import { Tune as TuneIcon } from '@mui/icons-material';
import PriceFilter from '../price';
import CategoryFilter from '../category';
import DateFilter from '../date';
import { DisplayEventFiltersProps } from '@/lib/constants';
import StatusFilter from '../status';

const FloatingButton = styled(Button)({
  position: 'fixed',
  bottom: 16,
  borderRadius: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1000,
});

export default function MobileEventFilters({ categoryList }: DisplayEventFiltersProps) {
  const [isMounted, setMounted] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'), { noSsr: true });

  useEffect(() => {
    setMounted(true);
  }, [isMobile]);

  if (!isMounted || !isMobile) return null;

  const toggleBottomSheet = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (
      event.type === 'keydown' &&
      ((event as React.KeyboardEvent).key === 'Tab' || (event as React.KeyboardEvent).key === 'Shift')
    ) {
      return;
    }
    setIsBottomSheetOpen(open);
  };

  return (
    <Box component="div">
      <FloatingButton variant="contained" color="primary" onClick={toggleBottomSheet(true)}>
        <Box
          component="div"
          sx={{
            display: 'flex',
            px: 2,
          }}
        >
          <TuneIcon />
          <Typography variant="body1" pl={1}>
            Filters
          </Typography>
        </Box>
      </FloatingButton>
      <Drawer
        anchor="bottom"
        open={isBottomSheetOpen}
        onClose={toggleBottomSheet(false)}
        PaperProps={{
          sx: {
            maxHeight: '80%',
            borderRadius: '8px 8px 0 0',
            backgroundColor: '#ffffffb',
          },
        }}
      >
        <Box component="div">
          <Typography variant="h6" p={2}>
            Filters
          </Typography>
        </Box>
        <Box component="div">
          <Typography variant="h6" p={2} onClick={toggleBottomSheet(false)}>
            X
          </Typography>
        </Box>
        <Box component="div" sx={{ p: 2 }}>
          <Box component="div">
            <PriceFilter />
          </Box>
          <Box component="div" pt={1}>
            <CategoryFilter categoryList={categoryList} />
          </Box>
          <Box component="div" pt={1}>
            <StatusFilter />
          </Box>
          <Box component="div" pt={1}>
            <DateFilter />
          </Box>
          <Box component="div" pt={1}>
            <Button variant="contained" size="large" color="secondary" fullWidth={true} sx={{ mt: 1, mb: 1 }}>
              Filter Events
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
}
