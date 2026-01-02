"use client";

import { useMemo } from 'react';
import { Box, Grid, Paper, Typography, Button, Stack, Chip } from '@mui/material';
import { EventPreview } from '@/data/graphql/query/Event/types';
import { EventCategory } from '@/data/graphql/types/graphql';
import { useEventFilters, EventFilterProvider } from '@/components/events/filters/event-filter-context';
import EventFiltersPanel from '@/components/events/filters/event-filters-panel';
import EventTileGrid from '@/components/events/event-tile-grid';
import SearchInput from '@/components/search/search-box';
import CustomContainer from '@/components/custom-container';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import { useFilteredEvents } from '@/components/events/filters/useFilteredEvents';
import { useNetworkActivity } from '@/lib/network/activity';

interface EventsContentProps {
  categories: EventCategory[];
  initialEvents: EventPreview[];
}

interface EventsClientWrapperProps {
  events: EventPreview[];
  categories: EventCategory[];
}

function EventsContent({ categories, initialEvents }: EventsContentProps) {
  const { filters, setSearchQuery, resetFilters, hasActiveFilters, removeCategory, removeStatus } = useEventFilters();
  const { events: serverEvents, loading } = useFilteredEvents(filters, initialEvents);
  const networkRequests = useNetworkActivity();
  const showSkeletons = loading || networkRequests > 0;

  const filteredEvents = useMemo(() => {
    const query = filters.searchQuery.trim().toLowerCase();
    if (!query) {
      return serverEvents;
    }
    return serverEvents.filter(
      event =>
        event.title?.toLowerCase().includes(query) ||
        event.summary?.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query),
    );
  }, [serverEvents, filters.searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <Box component="main" sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
      <CustomContainer>
        {/* Header Section */}
        <Box mb={5}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Box>
              <Typography
                variant="h3"
                fontWeight={700}
                sx={{
                  mb: 1,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Discover Events
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Find the perfect event for you from {filteredEvents.length} available events
              </Typography>
            </Box>
          </Stack>

          {/* Search Bar */}
          <SearchInput
            itemList={filteredEvents.map(item => item.title ?? '')}
            onSearch={handleSearch}
            sx={{
              mx: 'auto',
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                bgcolor: 'background.paper',
              },
            }}
          />
        </Box>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <Box mb={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'primary.50',
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={1}>
                <FilterListIcon sx={{ color: 'primary.main' }} />
                <Typography variant="subtitle2" fontWeight={600}>
                  Active Filters:
                </Typography>
                {filters.categories.map(cat => (
                  <Chip key={cat} label={cat} size="small" onDelete={() => removeCategory(cat)} />
                ))}
                {filters.statuses.map(status => (
                  <Chip key={status} label={status} size="small" onDelete={() => removeStatus(status)} />
                ))}
                {filters.searchQuery && (
                  <Chip label={`Search: "${filters.searchQuery}"`} size="small" onDelete={() => setSearchQuery('')} />
                )}
                <Button
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={resetFilters}
                  sx={{
                    ml: 'auto',
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Clear All
                </Button>
              </Stack>
            </Paper>
          </Box>
        )}

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 5 }} id="event-filters">
            <Box sx={{ position: 'sticky', top: 20 }}>
              <EventFiltersPanel categoryList={categories} loading={loading} />
            </Box>
          </Grid>

          {/* Events List */}
          <Grid size={{ xs: 12, md: 7 }} id="events">
            <Paper
              elevation={0}
              sx={{
                backgroundColor: 'background.paper',
                p: 3,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                minHeight: 400,
              }}
            >
              {loading || filteredEvents.length > 0 ? (
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h6" fontWeight={600}>
                      {showSkeletons
                        ? 'Loading events…'
                        : `${filteredEvents.length} Event${filteredEvents.length !== 1 ? 's' : ''} Found`}
                    </Typography>
                  </Stack>
                  <EventTileGrid events={filteredEvents} loading={showSkeletons} />
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 300,
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="h5" fontWeight={600} color="text.secondary" mb={2}>
                    No Events Found
                  </Typography>
                  <Typography variant="body1" color="text.secondary" mb={3}>
                    Try adjusting your filters or search criteria
                  </Typography>
                  {hasActiveFilters && (
                    <Button variant="contained" onClick={resetFilters} startIcon={<ClearIcon />}>
                      Clear All Filters
                    </Button>
                  )}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </CustomContainer>
    </Box>
  );
}

export default function EventsClientWrapper({ events, categories }: EventsClientWrapperProps) {
  return (
    <EventFilterProvider>
      <EventsContent categories={categories} initialEvents={events} />
    </EventFilterProvider>
  );
}
