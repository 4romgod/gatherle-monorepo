'use client';

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  useMediaQuery,
  useTheme,
  Fade,
  Paper,
  alpha,
  Button
} from "@mui/material";
import EventBoxSm from "@/components/events/event-box-sm";
import { EventType } from "@/data/graphql/types/graphql";
import {
  KeyboardArrowLeft,
  KeyboardArrowRight,
  FiberManualRecord,
  ArrowForward
} from "@mui/icons-material";
import Link from 'next/link';

interface CarouselProps {
  events: EventType[];
  title?: string;
  autoplay?: boolean;
  autoplayInterval?: number;
  itemWidth?: number;
  showIndicators?: boolean;
  viewAllEventsButton: boolean;
}

export default function Carousel({
  events,
  title,
  autoplay = true,
  autoplayInterval = 5000,
  itemWidth = 320,
  showIndicators = true,
  viewAllEventsButton = true
}: CarouselProps) {
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('md'));
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [showArrows, setShowArrows] = useState(false);

  // For smooth scrolling
  const itemsPerView = Math.floor((containerRef.current?.offsetWidth || 0) / (itemWidth + 16)) || 1;
  const totalScrollableItems = Math.max(0, events.length - itemsPerView);

  // Calculate the width of each slide item plus gap
  const calculateItemOffset = useCallback(() => {
    if (!containerRef.current) return itemWidth + 16; // Default item width + gap
    const containerWidth = containerRef.current.offsetWidth;
    const visibleItems = Math.floor(containerWidth / itemWidth);
    return containerRef.current.scrollWidth / Math.max(1, events.length - visibleItems);
  }, [events.length, itemWidth]);

  // Scroll to a specific index
  const scrollToIndex = useCallback((index: number) => {
    if (containerRef.current) {
      const newIndex = Math.max(0, Math.min(index, totalScrollableItems));
      const scrollAmount = newIndex * calculateItemOffset();

      containerRef.current.scrollTo({
        left: scrollAmount,
        behavior: 'smooth'
      });

      setActiveItemIndex(newIndex);
    }
  }, [calculateItemOffset, totalScrollableItems]);

  // Handle next and back navigation
  const handleNext = useCallback(() => {
    scrollToIndex(activeItemIndex + 1);
  }, [activeItemIndex, scrollToIndex]);

  const handleBack = useCallback(() => {
    scrollToIndex(activeItemIndex - 1);
  }, [activeItemIndex, scrollToIndex]);

  // Mouse drag handling
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (containerRef.current?.offsetLeft || 0));
    setScrollLeft(containerRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (containerRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2; // Drag sensitivity
    if (containerRef.current) {
      containerRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Snap to closest item after dragging
    if (containerRef.current) {
      const itemOffset = calculateItemOffset();
      const newIndex = Math.round(containerRef.current.scrollLeft / itemOffset);
      scrollToIndex(newIndex);
    }
  };

  // Touch handling for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX - (containerRef.current?.offsetLeft || 0));
    setScrollLeft(containerRef.current?.scrollLeft || 0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - (containerRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2;
    if (containerRef.current) {
      containerRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    // Snap to closest item after touch
    if (containerRef.current) {
      const itemOffset = calculateItemOffset();
      const newIndex = Math.round(containerRef.current.scrollLeft / itemOffset);
      scrollToIndex(newIndex);
    }
  };

  // Auto-play functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (autoplay && !isHovering && events.length > itemsPerView) {
      interval = setInterval(() => {
        if (activeItemIndex >= totalScrollableItems) {
          scrollToIndex(0);
        } else {
          scrollToIndex(activeItemIndex + 1);
        }
      }, autoplayInterval);
    }

    return () => clearInterval(interval);
  }, [autoplay, autoplayInterval, activeItemIndex, isHovering, events.length, itemsPerView, scrollToIndex, totalScrollableItems]);

  // Scroll event listener to update active index
  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current && !isDragging) {
        const itemOffset = calculateItemOffset();
        const newIndex = Math.round(containerRef.current.scrollLeft / itemOffset);
        setActiveItemIndex(newIndex);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [calculateItemOffset, isDragging]);

  // Show arrows when container is hovered
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowArrows(isHovering);
    }, 200);

    return () => clearTimeout(timer);
  }, [isHovering]);

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        mb: 4,
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px: 2 }}>
        {title && (
          <Typography variant="h5" fontWeight="bold">
            {title}
          </Typography>
        )}

        {viewAllEventsButton && (
          <Button
            endIcon={<ArrowForward />}
            color="secondary"
            component={Link}
            href="/events"
          >
            View all events
          </Button>
        )}

        {/* Desktop Navigation Controls */}
        {isLargeScreen && events.length > itemsPerView && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              onClick={handleBack}
              disabled={activeItemIndex <= 0}
              color="secondary"
              sx={{
                borderRadius: '50%',
                backgroundColor: theme => theme.palette.background.paper,
                boxShadow: 1,
                '&:hover': {
                  backgroundColor: theme => alpha(theme.palette.secondary.main, 0.08)
                }
              }}
            >
              <KeyboardArrowLeft />
            </IconButton>
            <IconButton
              onClick={handleNext}
              disabled={activeItemIndex >= totalScrollableItems}
              color="secondary"
              sx={{
                borderRadius: '50%',
                backgroundColor: theme => theme.palette.background.paper,
                boxShadow: 1,
                '&:hover': {
                  backgroundColor: theme => alpha(theme.palette.secondary.main, 0.08)
                }
              }}
            >
              <KeyboardArrowRight />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Carousel Container */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          borderRadius: 2
        }}
      >
        {/* Left Arrow (Mobile/Tablet + Hover) */}
        <Fade in={showArrows || !isLargeScreen}>
          <IconButton
            size="large"
            onClick={handleBack}
            disabled={activeItemIndex <= 0}
            sx={{
              position: 'absolute',
              left: 5,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              backgroundColor: theme => alpha(theme.palette.background.paper, 0.8),
              boxShadow: 2,
              color: 'secondary.main',
              '&:hover': {
                backgroundColor: 'background.paper',
              },
              opacity: activeItemIndex <= 0 ? 0.5 : 1,
            }}
          >
            <KeyboardArrowLeft />
          </IconButton>
        </Fade>

        {/* Right Arrow (Mobile/Tablet + Hover) */}
        <Fade in={showArrows || !isLargeScreen}>
          <IconButton
            size="large"
            onClick={handleNext}
            disabled={activeItemIndex >= totalScrollableItems}
            sx={{
              position: 'absolute',
              right: 5,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              backgroundColor: theme => alpha(theme.palette.background.paper, 0.8),
              boxShadow: 2,
              color: 'secondary.main',
              '&:hover': {
                backgroundColor: 'background.paper',
              },
              opacity: activeItemIndex >= totalScrollableItems ? 0.5 : 1,
            }}
          >
            <KeyboardArrowRight />
          </IconButton>
        </Fade>

        {/* Scrollable Items Container */}
        <Box
          ref={containerRef}
          sx={{
            display: 'flex',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            gap: 2,
            padding: 2,
            paddingBottom: showIndicators ? 4 : 2, // Add space for indicators
            '&::-webkit-scrollbar': { display: 'none' },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {events.map((event, index) => (
            <Paper
              key={index}
              elevation={1}
              sx={{
                flex: '0 0 auto',
                scrollSnapAlign: 'start',
                width: {
                  xs: '85%',
                  sm: `${itemWidth}px`
                },
                maxWidth: `${itemWidth}px`,
                transition: 'transform 0.3s, box-shadow 0.3s',
                transform: activeItemIndex === index ? 'scale(1.01)' : 'scale(1)',
                boxShadow: activeItemIndex === index ? 3 : 1,
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Link href={`/events/${event.slug}`}>
                <EventBoxSm event={event} />
              </Link>
            </Paper>
          ))}
        </Box>

        {/* Page Indicators */}
        {showIndicators && events.length > itemsPerView && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              position: 'absolute',
              bottom: 8,
              left: 0,
              right: 0,
              zIndex: 2,
            }}
          >
            {Array.from({ length: totalScrollableItems + 1 }).map((_, index) => (
              <Box
                key={index}
                onClick={() => scrollToIndex(index)}
                sx={{
                  cursor: 'pointer',
                  mx: 0.5,
                  transition: 'all 0.3s ease',
                }}
              >
                <FiberManualRecord
                  sx={{
                    fontSize: activeItemIndex === index ? 14 : 10,
                    color: (activeItemIndex === index) ? 'secondary.main' : alpha(theme.palette.secondary.main, 0.3),
                    transition: 'all 0.3s ease',
                  }}
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
