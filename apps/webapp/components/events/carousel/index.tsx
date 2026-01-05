'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Box, Typography, IconButton, useMediaQuery, useTheme, Paper, Stack, Button } from '@mui/material';
import EventBoxSm from '@/components/events/event-box-sm';
import { EventPreview } from '@/data/graphql/query/Event/types';
import { ChevronLeft, ChevronRight, ArrowForward } from '@mui/icons-material';
import Link from 'next/link';

interface EventCarouselProps {
  events: EventPreview[];
  title?: string;
  autoplay?: boolean;
  autoplayInterval?: number;
  itemWidth?: number;
  showIndicators?: boolean;
  viewAllEventsButton?: boolean;
}

export default function EventCarousel({
  events,
  title,
  itemWidth = 350,
  viewAllEventsButton = true,
}: EventCarouselProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Check scroll position to show/hide arrows
  const checkScrollPosition = useCallback(() => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    checkScrollPosition();
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      return () => container.removeEventListener('scroll', checkScrollPosition);
    }
  }, [checkScrollPosition]);

  useEffect(() => {
    const handleResize = () => checkScrollPosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkScrollPosition]);

  const scroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const scrollAmount = isMobile ? containerRef.current.clientWidth : itemWidth + 24;
      containerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (events.length === 0) {
    return null;
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      {(title || viewAllEventsButton) && (
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 3 }}
        >
          {title && (
            <Typography variant="h5" fontWeight={700}>
              {title}
            </Typography>
          )}
          {viewAllEventsButton && (
            <Button
              endIcon={<ArrowForward />}
              color="secondary"
              component={Link}
              href="/events"
              size="small"
            >
              View all
            </Button>
          )}
        </Stack>
      )}

      {/* Carousel */}
      <Box sx={{ position: 'relative' }}>
        {/* Navigation Arrows */}
        {!isMobile && canScrollLeft && (
          <IconButton
            onClick={() => scroll('left')}
            sx={{
              position: 'absolute',
              left: -20,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              bgcolor: 'background.paper',
              boxShadow: 2,
              '&:hover': {
                bgcolor: 'background.paper',
                boxShadow: 4,
              },
            }}
          >
            <ChevronLeft />
          </IconButton>
        )}

        {!isMobile && canScrollRight && (
          <IconButton
            onClick={() => scroll('right')}
            sx={{
              position: 'absolute',
              right: -20,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              bgcolor: 'background.paper',
              boxShadow: 2,
              '&:hover': {
                bgcolor: 'background.paper',
                boxShadow: 4,
              },
            }}
          >
            <ChevronRight />
          </IconButton>
        )}

        {/* Scrollable Container */}
        <Box
          ref={containerRef}
          sx={{
            display: 'flex',
            gap: 3,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            pb: 2,
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {events.map((event, index) => (
            <Box
              key={event.eventId || index}
              sx={{
                flex: '0 0 auto',
                width: isMobile ? '100%' : itemWidth,
                scrollSnapAlign: 'start',
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  overflow: 'hidden',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3,
                  },
                }}
              >
                <EventBoxSm event={event} />
              </Paper>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
