"use client";

import { Menu, MenuItem, Checkbox, ListItemText, ListItemIcon, Popover, Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { Dayjs } from 'dayjs';
import { EventCategory, EventStatus } from '@/data/graphql/types/graphql';
import { getEventCategoryIcon } from '@/lib/constants';
import { DATE_FILTER_LABELS } from '@/lib/constants/date-filters';

interface CategoryMenuProps {
  anchorEl: HTMLElement | null;
  categories: EventCategory[];
  selectedCategories: string[];
  onClose: () => void;
  onToggle: (categoryName: string) => void;
}

export function CategoryMenu({ anchorEl, categories, selectedCategories, onClose, onToggle }: CategoryMenuProps) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      slotProps={{
        paper: {
          className: 'glass-card',
          sx: {
            mt: 1,
            minWidth: 280,
            maxHeight: 400,
          },
        },
      }}
    >
      {categories.map((category) => {
        const IconComponent = getEventCategoryIcon(category.iconName);
        const isSelected = selectedCategories.includes(category.name);
        return (
          <MenuItem 
            key={category.eventCategoryId} 
            onClick={() => onToggle(category.name)}
            sx={{
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <Checkbox 
              checked={isSelected} 
              size="small"
              color="primary"
            />
            <ListItemIcon sx={{ minWidth: 36 }}>
              <IconComponent color={category.color || ''} height={20} width={20} />
            </ListItemIcon>
            <ListItemText 
              primary={category.name}
              sx={{ color: 'inherit' }}
            />
          </MenuItem>
        );
      })}
    </Menu>
  );
}

interface StatusMenuProps {
  anchorEl: HTMLElement | null;
  statuses: EventStatus[];
  selectedStatuses: EventStatus[];
  onClose: () => void;
  onToggle: (status: EventStatus) => void;
}

export function StatusMenu({ anchorEl, statuses, selectedStatuses, onClose, onToggle }: StatusMenuProps) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      slotProps={{
        paper: {
          className: 'glass-card',
          sx: {
            mt: 1,
            minWidth: 220,
          },
        },
      }}
    >
      {statuses.map((status) => {
        const isSelected = selectedStatuses.includes(status);
        return (
          <MenuItem 
            key={status} 
            onClick={() => onToggle(status)}
            sx={{
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <Checkbox 
              checked={isSelected} 
              size="small"
              color="secondary"
            />
            <ListItemText 
              primary={status}
              sx={{ color: 'inherit' }}
            />
          </MenuItem>
        );
      })}
    </Menu>
  );
}

interface DateMenuProps {
  anchorEl: HTMLElement | null;
  dateOptions: string[];
  selectedOption: string | null;
  customDateAnchor: HTMLElement | null;
  onClose: () => void;
  onSelect: (option: string, event?: React.MouseEvent<HTMLElement>) => void;
  onCustomDateChange: (date: Dayjs | null) => void;
  onCustomDateClose: () => void;
}

export function DateMenu({ 
  anchorEl, 
  dateOptions, 
  selectedOption, 
  customDateAnchor,
  onClose, 
  onSelect,
  onCustomDateChange,
  onCustomDateClose,
}: DateMenuProps) {
  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={onClose}
        slotProps={{
          paper: {
            className: 'glass-card',
            sx: {
              mt: 1,
              minWidth: 200,
            },
          },
        }}
      >
        {dateOptions.map((option) => {
          const isSelected = selectedOption === option;
          const label = DATE_FILTER_LABELS[option as keyof typeof DATE_FILTER_LABELS] || option;
          return (
            <MenuItem 
              key={option}
              onClick={(e) => onSelect(option, e)}
              sx={{
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                bgcolor: isSelected ? 'action.selected' : 'transparent',
                fontWeight: isSelected ? 600 : 400,
                color: 'inherit',
              }}
            >
              <ListItemText primary={label} />
            </MenuItem>
          );
        })}
      </Menu>

      {/* Custom Date Picker Popover */}
      <Popover
        open={Boolean(customDateAnchor)}
        anchorEl={customDateAnchor}
        onClose={onCustomDateClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            className: 'glass-card',
            sx: {
              mt: 1,
              ml: 1,
            },
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateCalendar
              onChange={(newValue) => {
                onCustomDateChange(newValue);
              }}
              sx={{
                '& .MuiPickersDay-root': {
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  },
                },
              }}
            />
          </LocalizationProvider>
        </Box>
      </Popover>
    </>
  );
}
