"use client";

import { Button, Stack } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TuneIcon from '@mui/icons-material/Tune';
import ClearIcon from '@mui/icons-material/Clear';

interface FilterButtonsProps {
  categoryCount: number;
  statusCount: number;
  selectedDateOption: string | null;
  hasActiveFilters: boolean;
  onCategoryClick: (event: React.MouseEvent<HTMLElement>) => void;
  onStatusClick: (event: React.MouseEvent<HTMLElement>) => void;
  onDateClick: (event: React.MouseEvent<HTMLElement>) => void;
  onClearAll: () => void;
}

export default function FilterButtons({
  categoryCount,
  statusCount,
  selectedDateOption,
  hasActiveFilters,
  onCategoryClick,
  onStatusClick,
  onDateClick,
  onClearAll,
}: FilterButtonsProps) {
  return (
    <Stack 
      direction="row" 
      spacing={1} 
      sx={{ 
        overflowX: 'auto',
        overflowY: 'hidden',
        flexWrap: 'nowrap',
        gap: 1,
        mb: 2,
        pb: 1,
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none', // IE and Edge
      }}
    >
      {/* Category Filter Button */}
      <Button
        variant="outlined"
        onClick={onCategoryClick}
        endIcon={<KeyboardArrowDownIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />}
        startIcon={<TuneIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />}
        className="glass-button"
        sx={{
          borderRadius: '50px',
          px: { xs: 1.5, sm: 2, md: 2.5 },
          py: { xs: 0.75, sm: 1, md: 1.15 },
          textTransform: 'none',
          fontWeight: 600,
          fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
          borderWidth: categoryCount > 0 ? 2 : 1,
          borderColor: categoryCount > 0 ? 'primary.main' : 'divider',
          bgcolor: categoryCount > 0 ? 'action.selected' : 'background.paper',
          color: 'text.primary',
          whiteSpace: 'nowrap',
          minWidth: 'auto',
          '&:hover': {
            bgcolor: 'action.hover',
            borderColor: 'primary.main',
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.2s ease',
        }}
      >
        {categoryCount > 0 ? `Categories (${categoryCount})` : 'Categories'}
      </Button>

      {/* Status Filter Button */}
      <Button
        variant="outlined"
        onClick={onStatusClick}
        endIcon={<KeyboardArrowDownIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />}
        className="glass-button"
        sx={{
          borderRadius: '50px',
          px: { xs: 1.5, sm: 2, md: 2.5 },
          py: { xs: 0.75, sm: 1, md: 1.15 },
          textTransform: 'none',
          fontWeight: 600,
          fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
          borderWidth: statusCount > 0 ? 2 : 1,
          borderColor: statusCount > 0 ? 'secondary.main' : 'divider',
          bgcolor: statusCount > 0 ? 'action.selected' : 'background.paper',
          color: 'text.primary',
          whiteSpace: 'nowrap',
          minWidth: 'auto',
          '&:hover': {
            bgcolor: 'action.hover',
            borderColor: 'secondary.main',
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.2s ease',
        }}
      >
        {statusCount > 0 ? `Status (${statusCount})` : 'Status'}
      </Button>

      {/* Date Filter Button */}
      <Button
        variant="outlined"
        onClick={onDateClick}
        endIcon={<KeyboardArrowDownIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />}
        startIcon={<CalendarTodayIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />}
        className="glass-button"
        sx={{
          borderRadius: '50px',
          px: { xs: 1.5, sm: 2, md: 2.5 },
          py: { xs: 0.75, sm: 1, md: 1.15 },
          textTransform: 'none',
          fontWeight: 600,
          fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
          borderWidth: selectedDateOption ? 2 : 1,
          borderColor: selectedDateOption ? 'primary.main' : 'divider',
          bgcolor: selectedDateOption ? 'action.selected' : 'background.paper',
          color: 'text.primary',
          whiteSpace: 'nowrap',
          minWidth: 'auto',
          '&:hover': {
            bgcolor: 'action.hover',
            borderColor: 'primary.light',
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.2s ease',
        }}
      >
        {selectedDateOption || 'Date'}
      </Button>

      {/* Clear All Button */}
      {hasActiveFilters && (
        <Button
          variant="text"
          onClick={onClearAll}
          startIcon={<ClearIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />}
          sx={{
            borderRadius: '50px',
            px: { xs: 1.5, sm: 2, md: 2.5 },
            py: { xs: 0.75, sm: 1, md: 1.15 },
            textTransform: 'none',
            fontWeight: 600,
            fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
            color: 'text.secondary',
            whiteSpace: 'nowrap',
            minWidth: 'auto',
            '&:hover': {
              bgcolor: 'action.hover',
              color: 'text.primary',
            },
            transition: 'all 0.2s ease',
          }}
        >
          Clear all
        </Button>
      )}
    </Stack>
  );
}
