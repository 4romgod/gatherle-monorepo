"use client";

import { useState, useEffect } from 'react';
import { Menu, MenuItem, Checkbox, ListItemText, ListItemIcon, Popover, Box, TextField, Button, Stack, Typography, Slider, Divider } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { Dayjs } from 'dayjs';
import { EventCategory, EventStatus } from '@/data/graphql/types/graphql';
import { getEventCategoryIcon } from '@/lib/constants';
import { DATE_FILTER_LABELS } from '@/lib/constants/date-filters';
import { useAppContext } from '@/hooks/useAppContext';
import { LocationFilter } from '@/components/events/filters/event-filter-context';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MyLocationIcon from '@mui/icons-material/MyLocation';

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

/**
 * Location filter menu component.
 * 
 * Note: This is a controlled component. The parent is responsible for closing
 * the menu (setting anchorEl to null) after handling onApply/onClear callbacks.
 * This ensures parent state is updated before the menu closes, preventing
 * stale state if the menu is quickly reopened.
 */
interface LocationMenuProps {
  anchorEl: HTMLElement | null;
  currentLocation: LocationFilter;
  onClose: () => void;
  onApply: (location: LocationFilter) => void;
  onClear: () => void;
}

export function LocationMenu({ 
  anchorEl, 
  currentLocation,
  onClose, 
  onApply,
  onClear,
}: LocationMenuProps) {
  const { setToastProps, toastProps } = useAppContext();
  const [city, setCity] = useState(currentLocation.city || '');
  const [state, setState] = useState(currentLocation.state || '');
  const [country, setCountry] = useState(currentLocation.country || '');
  const [radiusKm, setRadiusKm] = useState(currentLocation.radiusKm || 50);
  const [useMyLocation, setUseMyLocation] = useState(!!currentLocation.latitude);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    currentLocation.latitude && currentLocation.longitude 
      ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
      : null
  );

  // Sync internal state when currentLocation prop changes (e.g., filters cleared externally)
  useEffect(() => {
    setCity(currentLocation.city || '');
    setState(currentLocation.state || '');
    setCountry(currentLocation.country || '');
    setRadiusKm(currentLocation.radiusKm || 50);
    setUseMyLocation(!!currentLocation.latitude);
    setCoords(
      currentLocation.latitude && currentLocation.longitude
        ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
        : null
    );
  }, [currentLocation]);

  const showError = (message: string) => {
    setToastProps({
      ...toastProps,
      open: true,
      severity: 'error',
      message,
    });
  };

  const handleGetMyLocation = () => {
    if (!navigator.geolocation) {
      showError('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setUseMyLocation(true);
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        showError('Unable to get your location. Please check your browser permissions.');
        setGettingLocation(false);
      }
    );
  };

  const handleApply = () => {
    const location: LocationFilter = {};
    
    if (city.trim()) location.city = city.trim();
    if (state.trim()) location.state = state.trim();
    if (country.trim()) location.country = country.trim();
    
    if (useMyLocation && coords) {
      location.latitude = coords.lat;
      location.longitude = coords.lng;
      location.radiusKm = radiusKm;
    }
    
    // Let parent handle closing after state update to avoid race condition
    onApply(location);
  };

  const handleClear = () => {
    setCity('');
    setState('');
    setCountry('');
    setUseMyLocation(false);
    setCoords(null);
    setRadiusKm(50);
    // Let parent handle closing after state update to avoid race condition
    onClear();
  };

  const hasValues = city || state || country || useMyLocation;

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
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
            width: 320,
            p: 2,
          },
        },
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <LocationOnIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={600}>
            Filter by Location
          </Typography>
        </Stack>

        <TextField
          label="City"
          size="small"
          fullWidth
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g., San Francisco"
        />

        <TextField
          label="State / Province"
          size="small"
          fullWidth
          value={state}
          onChange={(e) => setState(e.target.value)}
          placeholder="e.g., California"
        />

        <TextField
          label="Country"
          size="small"
          fullWidth
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="e.g., United States"
        />

        <Divider sx={{ my: 1 }} />

        <Box>
          <Button
            variant={useMyLocation ? "contained" : "outlined"}
            size="small"
            fullWidth
            startIcon={<MyLocationIcon />}
            onClick={handleGetMyLocation}
            disabled={gettingLocation}
            sx={{ mb: 1 }}
          >
            {gettingLocation ? 'Getting location...' : useMyLocation ? 'Using my location' : 'Use my location'}
          </Button>
          
          {useMyLocation && coords && (
            <Box sx={{ px: 1 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Search radius: {radiusKm} km
              </Typography>
              <Slider
                value={radiusKm}
                onChange={(_, value) => setRadiusKm(value as number)}
                min={5}
                max={200}
                step={5}
                marks={[
                  { value: 5, label: '5' },
                  { value: 50, label: '50' },
                  { value: 100, label: '100' },
                  { value: 200, label: '200' },
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value} km`}
                size="small"
              />
              {radiusKm > 100 && (
                <Typography 
                  variant="caption" 
                  color="warning.main" 
                  sx={{ display: 'block', mt: 0.5 }}
                >
                  Large radius may include less precise results
                </Typography>
              )}
            </Box>
          )}
        </Box>

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button 
            variant="text" 
            size="small" 
            onClick={handleClear}
            disabled={!hasValues}
          >
            Clear
          </Button>
          <Button 
            variant="contained" 
            size="small" 
            onClick={handleApply}
            disabled={!hasValues}
          >
            Apply
          </Button>
        </Stack>
      </Stack>
    </Popover>
  );
}
