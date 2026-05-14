'use client';

import { useState, useEffect, useRef } from 'react';
import { useLazyQuery } from '@apollo/client';
import {
  TextField,
  Box,
  Typography,
  Avatar,
  Chip,
  Stack,
  InputAdornment,
  CircularProgress,
  Paper,
  ClickAwayListener,
  List,
  ListItem,
  ListItemButton,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Search, Event as EventIcon, LocationOn } from '@mui/icons-material';
import Link from 'next/link';
import { GetEventsDocument } from '@/data/graphql/query';
import type { EventPreview } from '@/data/graphql/query/Event/types';
import { SortOrderInput } from '@/data/graphql/types/graphql';
import { logger } from '@/lib/utils';
import { getEventPreviewHref, getEventPreviewTitle } from '@/components/events/event-preview-utils';

interface EventSearchBarProps {
  placeholder?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  autoFocus?: boolean;
  variant?: 'outlined' | 'filled' | 'standard';
}

/**
 * EventSearchBar - A scalable, performant event search component using useLazyQuery
 *
 * Features:
 * - Lazy loading: Only queries when user types (no initial load)
 * - Debounced search: 300ms delay to reduce API calls
 * - Minimum 2 characters: Prevents unnecessary queries
 * - Limited results: Fetches max 20 events per search
 * - Rich preview: Shows event image, title, location
 * - Loading states: Visual feedback during search
 * - Direct Link navigation: SEO-friendly, right-click support
 *
 * Scalability:
 * - Handles millions of events without performance issues
 * - Network-only fetch policy ensures fresh results
 * - Client-side filtering as temporary solution (backend text search recommended)
 *
 * @example
 * ```tsx
 * <EventSearchBar
 *   placeholder="Search events..."
 * />
 * ```
 */
export default function EventSearchBar({
  placeholder = 'Search events by title, location, or category...',
  size = 'medium',
  fullWidth = true,
  autoFocus = false,
  variant = 'outlined',
}: EventSearchBarProps) {
  const inputId = 'event-search-input';
  const [searchInput, setSearchInput] = useState('');
  const [eventOptions, setEventOptions] = useState<EventPreview[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [searchEvents, { loading: searchLoading }] = useLazyQuery(GetEventsDocument, {
    fetchPolicy: 'network-only',
  });

  // Debounced event search - only query when user types (min 2 chars)
  useEffect(() => {
    const searchTerm = searchInput.trim();

    if (searchTerm.length < 2) {
      setEventOptions([]);
      setIsOpen(false);
      return;
    }

    // Debounce search by 300ms to avoid excessive API calls
    const timeoutId = setTimeout(async () => {
      try {
        const { data } = await searchEvents({
          variables: {
            options: {
              search: {
                value: searchTerm,
                fields: [
                  'title',
                  'summary',
                  'description',
                  'location.address.city',
                  'location.address.state',
                  'eventCategories.name',
                ],
              },
              sort: [{ field: 'title', order: SortOrderInput.Asc }],
              pagination: { limit: 20 },
            },
          },
        });

        if (data?.readEvents) {
          setEventOptions(data.readEvents as EventPreview[]);
          setIsOpen(data.readEvents.length > 0);
        } else {
          setEventOptions([]);
          setIsOpen(false);
        }
      } catch (err) {
        logger.error('Error searching events:', err);
        setEventOptions([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput, searchEvents]);

  const handleClickAway = () => {
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    if (e.target.value.trim().length >= 2) {
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchInput('');
    }
  };

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box ref={containerRef} sx={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
        <TextField
          id={inputId}
          value={searchInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          size={size}
          variant={variant}
          autoFocus={autoFocus}
          fullWidth={fullWidth}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start" sx={{ ml: 0.5 }}>
                  <Search sx={{ color: 'text.secondary', fontSize: 22 }} />
                </InputAdornment>
              ),
              endAdornment: searchLoading ? (
                <InputAdornment position="end">
                  <CircularProgress color="inherit" size={20} />
                </InputAdornment>
              ) : null,
            },
          }}
          sx={(theme) => ({
            '& .MuiOutlinedInput-root': {
              borderRadius: 4,
              boxShadow:
                theme.palette.mode === 'light' ? `0 1px 2px ${alpha(theme.palette.common.black, 0.08)}` : 'none',
              '& fieldset': {
                borderColor:
                  theme.palette.mode === 'light'
                    ? alpha(theme.palette.text.primary, 0.2)
                    : alpha(theme.palette.common.white, 0.22),
              },
              '&:hover fieldset': {
                borderColor:
                  theme.palette.mode === 'light'
                    ? alpha(theme.palette.text.primary, 0.35)
                    : alpha(theme.palette.common.white, 0.35),
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
                borderWidth: 1,
              },
            },
            '& .MuiOutlinedInput-notchedOutline legend': {
              display: 'none',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              top: 0,
            },
            '& .MuiInputLabel-root': {
              display: 'none',
            },
          })}
        />

        {/* Dropdown Results */}
        {isOpen && (
          <Paper
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              mt: 1,
              maxHeight: 400,
              overflow: 'auto',
              zIndex: 1300,
              boxShadow: 3,
              borderRadius: 2,
            }}
          >
            <List sx={{ p: 0 }}>
              {searchLoading && searchInput.length >= 2 && eventOptions.length === 0 && (
                <ListItem sx={{ py: 3, justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Searching events...
                  </Typography>
                </ListItem>
              )}

              {!searchLoading && searchInput.length >= 2 && eventOptions.length === 0 && (
                <ListItem sx={{ py: 3, justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No events found
                  </Typography>
                </ListItem>
              )}

              {eventOptions.map((event) => (
                <ListItem key={event.eventId} disablePadding>
                  <ListItemButton
                    component={Link}
                    href={getEventPreviewHref(event)}
                    onClick={() => {
                      setSearchInput('');
                      setIsOpen(false);
                    }}
                    sx={{
                      display: 'flex',
                      gap: 2,
                      p: 1.5,
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    {/* Event Image/Icon */}
                    {event.media?.featuredImageUrl ? (
                      <Avatar
                        src={event.media.featuredImageUrl}
                        alt={getEventPreviewTitle(event)}
                        variant="rounded"
                        sx={{ width: 60, height: 60 }}
                      />
                    ) : (
                      <Avatar variant="rounded" sx={{ width: 60, height: 60, bgcolor: 'primary.main' }}>
                        <EventIcon />
                      </Avatar>
                    )}

                    {/* Event Details */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body1" fontWeight={600} noWrap>
                        {getEventPreviewTitle(event)}
                      </Typography>

                      {event.summary && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {event.summary}
                        </Typography>
                      )}

                      <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap" gap={0.5}>
                        {/* Location */}
                        {event.location?.address?.city && (
                          <Chip
                            icon={<LocationOn sx={{ fontSize: 14 }} />}
                            label={`${event.location.address.city}, ${event.location.address.state || ''}`}
                            size="small"
                            variant="outlined"
                            sx={{ height: 22, fontSize: '0.75rem' }}
                          />
                        )}

                        {/* First Category */}
                        {event.eventCategories?.[0] && (
                          <Chip
                            label={event.eventCategories[0].name}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.75rem',
                              bgcolor: event.eventCategories[0].color || 'primary.main',
                              color: 'common.white',
                            }}
                          />
                        )}
                      </Stack>
                    </Box>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
}
