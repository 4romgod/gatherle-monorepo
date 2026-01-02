"use client";

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Drawer,
  IconButton,
  Button,
  Stack,
  styled,
  Theme,
  useMediaQuery,
  Skeleton,
  Portal,
} from '@mui/material';
import { Tune as TuneIcon, Close as CloseIcon } from '@mui/icons-material';
import CategoryFilter from './category';
import StatusFilter from './status';
import DateFilter from './date';
import { DisplayEventFiltersProps } from '@/lib/constants';

const FloatingButton = styled(Button)(({ theme }) => ({
  position: 'fixed',
  bottom: 16,
  borderRadius: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 999,
}));

const PanelContent = ({ categoryList }: DisplayEventFiltersProps) => (
  <Stack spacing={2} sx={{ width: '100%' }}>
    {/* TODO bring back when ticket sales is working <PriceFilter /> */}
    <CategoryFilter categoryList={categoryList} />
    <StatusFilter />
    <DateFilter />
  </Stack>
);

const FilterLoadingSkeleton = () => (
  <Stack spacing={2} sx={{ width: '100%' }}>
    <Skeleton variant="text" width="50%" height={28} />
    {Array.from({ length: 4 }).map((_, index) => (
      <Skeleton
        key={`filter-skeleton-${index}`}
        variant="rectangular"
        height={48}
        animation="wave"
        sx={{ borderRadius: 1 }}
      />
    ))}
  </Stack>
);

type EventFiltersPanelProps = DisplayEventFiltersProps & {
  loading?: boolean;
};

export default function EventFiltersPanel({ categoryList, loading = false }: EventFiltersPanelProps) {
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'), { noSsr: true });
  const [mounted, setMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const content = loading ? <FilterLoadingSkeleton /> : <PanelContent categoryList={categoryList} />;

  useEffect(() => {
    setMounted(true);
  }, [isMobile]);

  if (!mounted) {
    return null;
  }

  if (isMobile) {
    return (
      <>
        <Portal>
          <FloatingButton variant="contained" color="primary" onClick={() => setDrawerOpen(true)}>
            <TuneIcon sx={{ mr: 1 }} />
            Filters
          </FloatingButton>
        </Portal>
        <Drawer
          anchor="bottom"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          slotProps={{
            paper: {
              sx: {
                borderRadius: '16px 16px 0 0',
                maxHeight: '80%',
                pb: 2,
              },
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
            <Typography variant="h6">Filters</Typography>
            <IconButton onClick={() => setDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ px: 2 }}>{content}</Box>
        </Drawer>
      </>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        backgroundColor: 'background.paper',
        p: 3,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="h6" fontWeight={600} mb={2}>
        Filters
      </Typography>
      {content}
    </Paper>
  );
}
