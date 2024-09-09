'use client';

import { Box, Theme, useMediaQuery } from '@mui/material';
import PriceFilter from '../price';
import CategoryFilter from '../category';
import DateFilter from '../date';
import { useEffect, useState } from 'react';
import { DisplayEventFiltersProps } from '@/lib/constants';
import StatusFilter from '../status';

export default function DesktopEventFilters({ categoryList }: DisplayEventFiltersProps) {
  const [isMounted, setMounted] = useState(false);
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'), { noSsr: true });

  useEffect(() => {
    setMounted(true);
  }, [isMobile]);

  if (!isMounted || isMobile) return null;

  return (
    <Box component="div">
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
    </Box>
  );
}
