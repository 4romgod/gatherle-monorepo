'use client';

import { useState, useEffect } from 'react';
import {
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Close, TuneOutlined, MyLocation, CalendarToday } from '@mui/icons-material';
import { Dayjs } from 'dayjs';
import { EventCategory, EventStatus } from '@/data/graphql/types/graphql';
import { LocationFilter } from '@/components/events/filters/EventFilterContext';
import { DATE_FILTER_LABELS, DATE_FILTER_OPTIONS } from '@/lib/constants/date-filters';
import { getEventCategoryIcon } from '@/lib/constants';
import { useAppContext } from '@/hooks/useAppContext';
import { useSavedLocation } from '@/hooks/useSavedLocation';
import { useSession } from 'next-auth/react';
import { logger } from '@/lib/utils';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';

interface EventFiltersBottomSheetProps {
  categories: EventCategory[];
  statuses: EventStatus[];
  dateOptions: string[];

  selectedCategories: string[];
  selectedStatuses: EventStatus[];
  selectedDateOption: string | null;
  selectedLocation: LocationFilter;

  onToggleCategory: (category: string) => void;
  onToggleStatus: (status: EventStatus) => void;
  onChangeDateOption: (option: string) => void;
  onCustomDateChange: (date: Dayjs | null) => void;
  onApplyLocation: (location: LocationFilter) => void;
  onClearLocation: () => void;
  onClearAll: () => void;

  activeFilterCount: number;
}

/**
 * Mobile-only bottom sheet that consolidates all event filters into a
 * single accessible drawer. Triggered by the "Filters" button in the
 * event list header, visible only at xs/sm breakpoints.
 */
export default function EventFiltersBottomSheet({
  categories,
  statuses,
  dateOptions,
  selectedCategories,
  selectedStatuses,
  selectedDateOption,
  selectedLocation,
  onToggleCategory,
  onToggleStatus,
  onChangeDateOption,
  onCustomDateChange,
  onApplyLocation,
  onClearLocation,
  onClearAll,
  activeFilterCount,
}: EventFiltersBottomSheetProps) {
  const [open, setOpen] = useState(false);
  const [showCustomDateCalendar, setShowCustomDateCalendar] = useState(false);

  // Location local state (mirrors LocationMenu logic)
  const { setToastProps, toastProps } = useAppContext();
  const { data: session } = useSession();
  const userId = session?.user?.userId;
  const { location: savedLocation, setLocation: setSavedLocation } = useSavedLocation(userId);

  const [city, setCity] = useState(selectedLocation.city || '');
  const [state, setState] = useState(selectedLocation.state || '');
  const [country, setCountry] = useState(selectedLocation.country || '');
  const [radiusKm, setRadiusKm] = useState(selectedLocation.radiusKm ?? 50);
  const [useMyLocation, setUseMyLocation] = useState(!!selectedLocation.latitude);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    selectedLocation.latitude && selectedLocation.longitude
      ? { lat: selectedLocation.latitude, lng: selectedLocation.longitude }
      : null,
  );

  // Sync local location state when external location changes
  useEffect(() => {
    setCity(selectedLocation.city || '');
    setState(selectedLocation.state || '');
    setCountry(selectedLocation.country || '');
    setRadiusKm(selectedLocation.radiusKm ?? 50);
    setUseMyLocation(!!selectedLocation.latitude);
    setCoords(
      selectedLocation.latitude && selectedLocation.longitude
        ? { lat: selectedLocation.latitude, lng: selectedLocation.longitude }
        : null,
    );
  }, [selectedLocation]);

  const handleGetMyLocation = () => {
    if (savedLocation.latitude && savedLocation.longitude) {
      setCoords({ lat: savedLocation.latitude, lng: savedLocation.longitude });
      setRadiusKm(savedLocation.radiusKm ?? 50);
      setUseMyLocation(true);
      return;
    }
    if (!navigator.geolocation) {
      setToastProps({ ...toastProps, open: true, severity: 'error', message: 'Geolocation is not supported.' });
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCoords(nextCoords);
        setSavedLocation({ latitude: nextCoords.lat, longitude: nextCoords.lng, radiusKm });
        setUseMyLocation(true);
        setGettingLocation(false);
      },
      (err) => {
        logger.error('Geolocation error', err);
        setToastProps({
          ...toastProps,
          open: true,
          severity: 'error',
          message: 'Unable to get location. Check browser permissions.',
        });
        setGettingLocation(false);
      },
    );
  };

  const handleApplyLocation = () => {
    const location: LocationFilter = {};
    if (city.trim()) location.city = city.trim();
    if (state.trim()) location.state = state.trim();
    if (country.trim()) location.country = country.trim();
    const displayLabel = [city, state, country].filter(Boolean).join(', ');
    if (displayLabel) location.displayLabel = displayLabel;
    if (useMyLocation && coords) {
      location.latitude = coords.lat;
      location.longitude = coords.lng;
      location.radiusKm = radiusKm;
      setSavedLocation({ latitude: coords.lat, longitude: coords.lng, radiusKm });
    }
    onApplyLocation(location);
  };

  const handleClearLocation = () => {
    setCity('');
    setState('');
    setCountry('');
    setUseMyLocation(false);
    setCoords(null);
    setRadiusKm(50);
    onClearLocation();
  };

  const hasLocationValues = !!(city || state || country || useMyLocation);

  return (
    <>
      {/* Trigger button — visible on mobile only */}
      <Badge
        badgeContent={activeFilterCount > 0 ? activeFilterCount : null}
        color="primary"
        sx={{ display: { xs: 'inline-flex', md: 'none' } }}
      >
        <Button
          variant="outlined"
          startIcon={<TuneOutlined fontSize="small" />}
          onClick={() => setOpen(true)}
          sx={{
            borderRadius: '50px',
            px: 2,
            py: 0.875,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            borderColor: activeFilterCount > 0 ? 'primary.main' : 'divider',
            bgcolor: activeFilterCount > 0 ? 'primary.light' : 'background.paper',
            color: 'text.primary',
            whiteSpace: 'nowrap',
          }}
        >
          Filters
        </Button>
      </Badge>

      {/* Bottom drawer */}
      <Drawer
        anchor="bottom"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '90vh',
              '@supports (height: 100dvh)': {
                maxHeight: '90dvh',
              },
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        {/* Handle bar */}
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1, pb: 0.5 }}>
          <Box
            sx={{
              width: 36,
              height: 4,
              borderRadius: 2,
              bgcolor: 'action.hover',
            }}
          />
        </Box>

        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Typography>
          <IconButton size="small" onClick={() => setOpen(false)} aria-label="Close filters">
            <Close fontSize="small" />
          </IconButton>
        </Box>

        {/* Scrollable content */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2 }}>
          {/* Categories */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="overline" fontWeight={700} color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
              Categories
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1.5 }}>
              {categories.map((category) => {
                const isSelected = selectedCategories.includes(category.name);
                const IconComponent = getEventCategoryIcon(category.iconName);
                return (
                  <Chip
                    key={category.eventCategoryId}
                    label={category.name}
                    icon={
                      <Box sx={{ display: 'flex', ml: 0.5 }}>
                        <IconComponent height={14} width={14} />
                      </Box>
                    }
                    onClick={() => onToggleCategory(category.name)}
                    variant={isSelected ? 'filled' : 'outlined'}
                    color={isSelected ? 'primary' : 'default'}
                    size="medium"
                    sx={{
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  />
                );
              })}
            </Stack>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Status */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="overline" fontWeight={700} color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
              Status
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1.5 }}>
              {statuses.map((status) => {
                const isSelected = selectedStatuses.includes(status);
                return (
                  <Chip
                    key={status}
                    label={status}
                    onClick={() => onToggleStatus(status)}
                    variant={isSelected ? 'filled' : 'outlined'}
                    color={isSelected ? 'secondary' : 'default'}
                    size="medium"
                    sx={{ fontWeight: isSelected ? 700 : 500, cursor: 'pointer' }}
                  />
                );
              })}
            </Stack>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Date */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="overline" fontWeight={700} color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
              Date
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1.5 }}>
              {dateOptions.map((option) => {
                const isSelected = selectedDateOption === option;
                const label = DATE_FILTER_LABELS[option as keyof typeof DATE_FILTER_LABELS] || option;
                return (
                  <Chip
                    key={option}
                    label={label}
                    icon={option === DATE_FILTER_OPTIONS.CUSTOM ? <CalendarToday sx={{ fontSize: 14 }} /> : undefined}
                    onClick={() => {
                      if (option === DATE_FILTER_OPTIONS.CUSTOM) {
                        setShowCustomDateCalendar(true);
                      }
                      onChangeDateOption(option);
                    }}
                    variant={isSelected ? 'filled' : 'outlined'}
                    color={isSelected ? 'primary' : 'default'}
                    size="medium"
                    sx={{ fontWeight: isSelected ? 700 : 500, cursor: 'pointer' }}
                  />
                );
              })}
            </Stack>
            {(selectedDateOption === DATE_FILTER_OPTIONS.CUSTOM || showCustomDateCalendar) && (
              <Box sx={{ mt: 2 }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateCalendar
                    onChange={(newValue) => {
                      onCustomDateChange(newValue);
                      setShowCustomDateCalendar(false);
                    }}
                    sx={{
                      width: '100%',
                      '& .MuiPickersDay-root.Mui-selected': { bgcolor: 'primary.main' },
                    }}
                  />
                </LocalizationProvider>
              </Box>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Location */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="overline" fontWeight={700} color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
              Location
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 1.5 }}>
              <Button
                variant={useMyLocation ? 'contained' : 'outlined'}
                size="small"
                fullWidth
                startIcon={<MyLocation />}
                onClick={handleGetMyLocation}
                disabled={gettingLocation}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
              >
                {gettingLocation ? 'Getting location…' : useMyLocation ? 'Using my location ✓' : 'Use my location'}
              </Button>
              {useMyLocation && coords && (
                <Box sx={{ px: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Search radius: {radiusKm} km
                  </Typography>
                  <Slider
                    value={radiusKm}
                    onChange={(_, v) => setRadiusKm(v as number)}
                    min={5}
                    max={200}
                    step={5}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => `${v} km`}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              )}
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
              <Stack direction="row" spacing={1}>
                <Button
                  variant="text"
                  size="small"
                  onClick={handleClearLocation}
                  disabled={!hasLocationValues}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Clear location
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleApplyLocation}
                  disabled={!hasLocationValues}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                >
                  Apply location
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            gap: 1.5,
            pb: 'max(env(safe-area-inset-bottom, 0px), 16px)',
          }}
        >
          <Button
            fullWidth
            variant="outlined"
            onClick={() => {
              onClearAll();
              handleClearLocation();
            }}
            disabled={activeFilterCount === 0}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Clear all
          </Button>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={() => setOpen(false)}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            Show results
          </Button>
        </Box>
      </Drawer>
    </>
  );
}
