'use client';

import { useState, useEffect } from 'react';
import {
  Menu,
  MenuItem,
  Checkbox,
  ListItemText,
  ListItemIcon,
  Popover,
  Box,
  TextField,
  Button,
  Stack,
  Typography,
  Slider,
  Divider,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TuneIcon from '@mui/icons-material/Tune';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { Dayjs } from 'dayjs';
import { EventCategory, EventStatus } from '@/data/graphql/types/graphql';
import { getEventCategoryIcon } from '@/lib/constants';
import { DATE_FILTER_LABELS, DATE_FILTER_OPTIONS } from '@/lib/constants/date-filters';
import { useAppContext } from '@/hooks/useAppContext';
import { LocationFilter } from '@/components/events/filters/EventFilterContext';
import { useSavedLocation } from '@/hooks/useSavedLocation';
import { useSession } from 'next-auth/react';

// TODO: Refactor filter menu components (CategoryMenu, StatusMenu, DateMenu, LocationMenu) to avoid dual-mode (controlled/uncontrolled) complexity. Prefer either fully controlled or fully uncontrolled with callback props for clarity and maintainability.

export function CategoryMenu({
  categories,
  selectedCategories,
  onChange,
  anchorEl,
  onClose,
  onToggle,
  hideButton,
}: {
  categories: EventCategory[];
  selectedCategories: string[];
  onChange?: (categories: string[]) => void;
  anchorEl?: HTMLElement | null;
  onClose?: () => void;
  onToggle?: (category: string) => void;
  hideButton?: boolean;
}) {
  const [internalAnchorEl, setInternalAnchorEl] = useState<null | HTMLElement>(null);
  const isControlled = typeof anchorEl !== 'undefined';
  const menuAnchor = isControlled ? anchorEl : internalAnchorEl;
  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (!isControlled) setInternalAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    if (!isControlled) setInternalAnchorEl(null);
    if (onClose) onClose();
  };
  const handleToggle = (category: string) => {
    if (onToggle) {
      onToggle(category);
    } else if (onChange) {
      const newSelected = selectedCategories.includes(category)
        ? selectedCategories.filter((c) => c !== category)
        : [...selectedCategories, category];
      onChange(newSelected);
    }
  };
  return (
    <>
      {!hideButton && (
        <Button
          onClick={handleOpen}
          variant="outlined"
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
            borderWidth: 1,
            borderColor: selectedCategories.length > 0 ? 'primary.light' : 'primary.light',
            bgcolor: selectedCategories.length > 0 ? 'primary.light' : 'background.paper',
            color: selectedCategories.length > 0 ? 'text.disabled' : 'text.primary',
            whiteSpace: 'nowrap',
            minWidth: 'auto',
            '&:hover': {
              color: 'text.primary',
              bgcolor: 'action.hover',
              borderColor: 'primary.main',
            },
          }}
        >
          {selectedCategories.length > 0 ? `Categories (${selectedCategories.length})` : 'Categories'}
        </Button>
      )}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleClose}
        slotProps={{
          paper: {
            className: 'glass-card',
            sx: { mt: 1, minWidth: 280, maxHeight: 400 },
          },
        }}
      >
        {categories.map((category) => {
          const IconComponent = getEventCategoryIcon(category.iconName);
          const isSelected = selectedCategories.includes(category.name);
          return (
            <MenuItem
              key={category.eventCategoryId}
              onClick={() => handleToggle(category.name)}
              sx={{ '&:hover': { bgcolor: 'action.hover' } }}
            >
              <Checkbox checked={isSelected} size="small" color="primary" />
              <ListItemIcon sx={{ minWidth: 36 }}>
                <IconComponent color={category.color || ''} height={20} width={20} />
              </ListItemIcon>
              <ListItemText primary={category.name} sx={{ color: 'inherit' }} />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

export function StatusMenu({
  statuses,
  selectedStatuses,
  onChange,
  anchorEl,
  onClose,
  onToggle,
  hideButton,
}: {
  statuses: EventStatus[];
  selectedStatuses: EventStatus[];
  onChange?: (statuses: EventStatus[]) => void;
  anchorEl?: HTMLElement | null;
  onClose?: () => void;
  onToggle?: (status: EventStatus) => void;
  hideButton?: boolean;
}) {
  const [internalAnchorEl, setInternalAnchorEl] = useState<null | HTMLElement>(null);
  const isControlled = typeof anchorEl !== 'undefined';
  const menuAnchor = isControlled ? anchorEl : internalAnchorEl;
  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (!isControlled) setInternalAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    if (!isControlled) setInternalAnchorEl(null);
    if (onClose) onClose();
  };
  const handleToggle = (status: EventStatus) => {
    if (onToggle) {
      onToggle(status);
    } else if (onChange) {
      const newSelected = selectedStatuses.includes(status)
        ? selectedStatuses.filter((s) => s !== status)
        : [...selectedStatuses, status];
      onChange(newSelected);
    }
  };
  return (
    <>
      {!hideButton && (
        <Button
          onClick={handleOpen}
          variant="outlined"
          endIcon={<KeyboardArrowDownIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />}
          className="glass-button"
          sx={{
            borderRadius: '50px',
            px: { xs: 1.5, sm: 2, md: 2.5 },
            py: { xs: 0.75, sm: 1, md: 1.15 },
            textTransform: 'none',
            fontWeight: 600,
            fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
            borderWidth: 1,
            borderColor: selectedStatuses.length > 0 ? 'primary.light' : 'primary.light',
            bgcolor: selectedStatuses.length > 0 ? 'primary.light' : 'background.paper',
            color: selectedStatuses.length > 0 ? 'text.disabled' : 'text.primary',
            whiteSpace: 'nowrap',
            minWidth: 'auto',
            '&:hover': {
              color: 'text.primary',
              bgcolor: 'action.hover',
              borderColor: 'primary.main',
            },
          }}
        >
          {selectedStatuses.length > 0 ? `Status (${selectedStatuses.length})` : 'Status'}
        </Button>
      )}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleClose}
        slotProps={{
          paper: {
            className: 'glass-card',
            sx: { mt: 1, minWidth: 220 },
          },
        }}
      >
        {statuses.map((status) => {
          const isSelected = selectedStatuses.includes(status);
          return (
            <MenuItem key={status} onClick={() => handleToggle(status)} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
              <Checkbox checked={isSelected} size="small" color="secondary" />
              <ListItemText primary={status} sx={{ color: 'inherit' }} />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

export function DateMenu({
  dateOptions,
  selectedOption,
  onChange,
  onCustomDateChange,
  anchorEl,
  onClose,
  hideButton,
}: {
  dateOptions: string[];
  selectedOption: string | null;
  onChange: (option: string) => void;
  onCustomDateChange: (date: Dayjs | null) => void;
  anchorEl?: HTMLElement | null;
  onClose?: () => void;
  hideButton?: boolean;
}) {
  const [internalAnchorEl, setInternalAnchorEl] = useState<null | HTMLElement>(null);
  const [customDateAnchor, setCustomDateAnchor] = useState<null | HTMLElement>(null);
  const [shouldOpenCustom, setShouldOpenCustom] = useState(false);
  const isControlled = typeof anchorEl !== 'undefined';
  const menuAnchor = isControlled ? anchorEl : internalAnchorEl;

  useEffect(() => {
    if (selectedOption !== DATE_FILTER_OPTIONS.CUSTOM) {
      setCustomDateAnchor(null);
      setSelectedCustomDate(null);
    }
  }, [selectedOption]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (!isControlled) setInternalAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    if (!isControlled) setInternalAnchorEl(null);
    if (onClose) onClose();
  };
  const handleSelect = (option: string, event?: React.MouseEvent<HTMLElement>) => {
    if (option === DATE_FILTER_OPTIONS.CUSTOM) {
      // Close the menu, then open the popover anchored to the button
      setShouldOpenCustom(true);
      onChange(option);
      handleClose();
    } else {
      onChange(option);
      handleClose();
    }
  };

  // Open the custom date popover after menu closes
  useEffect(() => {
    if (shouldOpenCustom && !menuAnchor) {
      const button = document.querySelector('[data-date-filter-button]') as HTMLElement | null;
      if (button) {
        setCustomDateAnchor(button);
      }
      setShouldOpenCustom(false);
    }
  }, [shouldOpenCustom, menuAnchor]);
  const handleCustomDateClose = () => setCustomDateAnchor(null);
  // Show user-friendly label for selected date filter
  // Track the selected custom date in local state for display
  const [selectedCustomDate, setSelectedCustomDate] = useState<Dayjs | null>(null);

  // If the selected option is not custom, clear the custom date
  useEffect(() => {
    if (selectedOption !== DATE_FILTER_OPTIONS.CUSTOM) {
      setSelectedCustomDate(null);
    }
  }, [selectedOption]);

  let buttonLabel = 'Date';
  if (selectedOption === DATE_FILTER_OPTIONS.CUSTOM && selectedCustomDate) {
    buttonLabel = selectedCustomDate.format('MMM D, YYYY');
  } else if (selectedOption) {
    buttonLabel = DATE_FILTER_LABELS[selectedOption as keyof typeof DATE_FILTER_LABELS] || selectedOption;
  }
  return (
    <>
      {!hideButton && (
        <Button
          onClick={handleOpen}
          variant="outlined"
          endIcon={<KeyboardArrowDownIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />}
          startIcon={<CalendarTodayIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />}
          className="glass-button"
          data-date-filter-button
          sx={{
            borderRadius: '50px',
            px: { xs: 1.5, sm: 2, md: 2.5 },
            py: { xs: 0.75, sm: 1, md: 1.15 },
            textTransform: 'none',
            fontWeight: 600,
            fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
            borderWidth: 1,
            borderColor: selectedOption ? 'primary.light' : 'primary.light',
            bgcolor: selectedOption ? 'primary.light' : 'background.paper',
            color: selectedOption ? 'text.disabled' : 'text.primary',
            whiteSpace: 'nowrap',
            minWidth: 'auto',
            '&:hover': {
              color: 'text.primary',
              bgcolor: 'action.hover',
              borderColor: 'primary.main',
            },
          }}
        >
          {buttonLabel}
        </Button>
      )}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleClose}
        slotProps={{
          paper: {
            className: 'glass-card',
            sx: {},
          },
        }}
      >
        {dateOptions.map((option) => {
          const isSelected = selectedOption === option;
          const label = DATE_FILTER_LABELS[option as keyof typeof DATE_FILTER_LABELS] || option;
          return (
            <MenuItem
              key={option}
              onClick={(e) => handleSelect(option, e)}
              sx={{
                '&:hover': { bgcolor: 'action.hover' },
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
      <Popover
        open={Boolean(customDateAnchor)}
        anchorEl={customDateAnchor}
        onClose={handleCustomDateClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            className: 'glass-card',
            sx: { mt: 1, ml: 1 },
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateCalendar
              onChange={(newValue) => {
                onChange(DATE_FILTER_OPTIONS.CUSTOM);
                setSelectedCustomDate(newValue);
                onCustomDateChange(newValue);
                handleCustomDateClose();
              }}
              sx={{
                '& .MuiPickersDay-root': {
                  '&:hover': { bgcolor: 'action.hover' },
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    '&:hover': { bgcolor: 'primary.dark' },
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

export function LocationMenu({
  currentLocation,
  onApply,
  onClear,
  anchorEl,
  onClose,
  hideButton,
}: {
  currentLocation: LocationFilter;
  onApply: (location: LocationFilter) => void;
  onClear: () => void;
  anchorEl?: HTMLElement | null;
  onClose?: () => void;
  hideButton?: boolean;
}) {
  const { setToastProps, toastProps } = useAppContext();
  const { data: session } = useSession();
  const userId = session?.user?.userId;
  const { location: savedLocation, setLocation: setSavedLocation } = useSavedLocation(userId);
  const [internalAnchorEl, setInternalAnchorEl] = useState<null | HTMLElement>(null);
  const isControlled = typeof anchorEl !== 'undefined';
  const menuAnchor = isControlled ? anchorEl : internalAnchorEl;
  const [city, setCity] = useState(currentLocation.city || '');
  const [state, setState] = useState(currentLocation.state || '');
  const [country, setCountry] = useState(currentLocation.country || '');
  const [radiusKm, setRadiusKm] = useState(currentLocation.radiusKm ?? 50);
  const [useMyLocation, setUseMyLocation] = useState(!!currentLocation.latitude);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    currentLocation.latitude && currentLocation.longitude
      ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
      : null,
  );

  useEffect(() => {
    setCity(currentLocation.city || '');
    setState(currentLocation.state || '');
    setCountry(currentLocation.country || '');
    setRadiusKm(currentLocation.radiusKm ?? 50);
    setUseMyLocation(!!currentLocation.latitude);
    setCoords(
      currentLocation.latitude && currentLocation.longitude
        ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
        : null,
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

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (!isControlled) setInternalAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    if (!isControlled) setInternalAnchorEl(null);
    if (onClose) onClose();
  };

  const handleGetMyLocation = () => {
    if (savedLocation.latitude && savedLocation.longitude) {
      setCoords({ lat: savedLocation.latitude, lng: savedLocation.longitude });
      setRadiusKm(savedLocation.radiusKm ?? 50);
      setUseMyLocation(true);
      return;
    }

    if (!navigator.geolocation) {
      showError('Geolocation is not supported by your browser');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCoords(nextCoords);
        setSavedLocation({
          latitude: nextCoords.lat,
          longitude: nextCoords.lng,
          radiusKm,
        });
        setUseMyLocation(true);
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        showError('Unable to get your location. Please check your browser permissions.');
        setGettingLocation(false);
      },
    );
  };

  const handleApply = () => {
    const location: LocationFilter = {};
    const cityValue = city.trim();
    const stateValue = state.trim();
    const countryValue = country.trim();
    const displayLabel = [cityValue, stateValue, countryValue].filter(Boolean).join(', ');
    if (cityValue) location.city = cityValue;
    if (stateValue) location.state = stateValue;
    if (countryValue) location.country = countryValue;
    if (displayLabel) {
      location.displayLabel = displayLabel;
    } else if (useMyLocation && savedLocation.displayLabel) {
      location.displayLabel = savedLocation.displayLabel;
    }
    if (useMyLocation && coords) {
      location.latitude = coords.lat;
      location.longitude = coords.lng;
      location.radiusKm = radiusKm;
      setSavedLocation({
        latitude: coords.lat,
        longitude: coords.lng,
        radiusKm,
        displayLabel: displayLabel || savedLocation.displayLabel,
      });
    }
    onApply(location);
    handleClose();
  };

  const handleClear = () => {
    setCity('');
    setState('');
    setCountry('');
    setUseMyLocation(false);
    setCoords(null);
    setRadiusKm(50);
    onClear();
    handleClose();
  };

  const hasValues = city || state || country || useMyLocation;
  const buttonLabel = hasValues
    ? [city, state, country].filter(Boolean).join(', ') || savedLocation.displayLabel || 'Near me'
    : 'Location';

  return (
    <>
      {!hideButton && (
        <Button
          onClick={handleOpen}
          variant="outlined"
          endIcon={<KeyboardArrowDownIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />}
          startIcon={<LocationOnIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} />}
          className="glass-button"
          sx={{
            borderRadius: '50px',
            px: { xs: 1.5, sm: 2, md: 2.5 },
            py: { xs: 0.75, sm: 1, md: 1.15 },
            textTransform: 'none',
            fontWeight: 600,
            fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' },
            borderWidth: 1,
            borderColor: hasValues ? 'primary.light' : 'primary.light',
            bgcolor: hasValues ? 'primary.light' : 'background.paper',
            color: hasValues ? 'text.disabled' : 'text.primary',
            whiteSpace: 'nowrap',
            minWidth: 'auto',
            '&:hover': {
              color: 'text.primary',
              bgcolor: 'action.hover',
              borderColor: 'primary.main',
            },
          }}
        >
          {buttonLabel}
        </Button>
      )}
      <Popover
        open={Boolean(menuAnchor)}
        anchorEl={menuAnchor}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            className: 'glass-card',
            sx: { mt: 1, width: 320, p: 2 },
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
              variant={useMyLocation ? 'contained' : 'outlined'}
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
                  <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                    Large radius may include less precise results
                  </Typography>
                )}
              </Box>
            )}
          </Box>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button variant="text" size="small" onClick={handleClear} disabled={!hasValues}>
              Clear
            </Button>
            <Button variant="contained" size="small" onClick={handleApply} disabled={!hasValues}>
              Apply
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </>
  );
}
