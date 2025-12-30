'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Box, Typography, IconButton, useMediaQuery, useTheme, Fade, Paper, alpha, Button } from '@mui/material';
import EventBoxSm from '@/components/events/event-box-sm';
import { EventPreview } from '@/data/graphql/query/Event/types';
import { KeyboardArrowLeft, KeyboardArrowRight, FiberManualRecord, ArrowForward } from '@mui/icons-material';
import Link from 'next/link';

interface EventCarouselProps {
  events: EventPreview[];
  title?: string;
  autoplay?: boolean;
  autoplayInterval?: number;
  itemWidth?: number;
  showIndicators?: boolean;
  viewAllEventsButton: boolean;
}

export default function EventCarousel({
  events,
  title,
  autoplay = true,
  autoplayInterval = 5000,
  itemWidth = 320,
  showIndicators = true,
  viewAllEventsButton = true,
}: EventCarouselProps) {
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('md'));
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [showArrows, setShowArrows] = useState(false);

  // For smooth scrolling - calculate visible items
  const getItemsPerView = useCallback(() => {
    if (!containerRef.current) {
      if (typeof window !== 'undefined') {
        return isMobile ? 1 : Math.floor((window.innerWidth * 0.8) / (itemWidth + 8));
      }
      return 1;
    }
    return isMobile ? 1 : Math.floor(containerRef.current.offsetWidth / (itemWidth + 8));
  }, [isMobile, itemWidth]);

  const [itemsPerView, setItemsPerView] = useState(getItemsPerView());

  // Update items per view on resize
  useEffect(() => {
    const handleResize = () => {
      setItemsPerView(getItemsPerView());
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial calculation

    return () => window.removeEventListener('resize', handleResize);
  }, [getItemsPerView, isMobile]);

  // Calculate the width of each slide item
  const calculateItemOffset = useCallback(() => {
    if (!containerRef.current) return itemWidth + 16;

    // For mobile, each item is exactly the container width
    if (isMobile) {
      return containerRef.current.offsetWidth;
    }

    const containerWidth = containerRef.current.offsetWidth;
    const visibleItems = Math.floor(containerWidth / itemWidth);
    return containerRef.current.scrollWidth / Math.max(1, events.length - (visibleItems > 0 ? visibleItems : 1));
  }, [events.length, itemWidth, isMobile]);

  // Scroll to a specific index with exact positioning for mobile
  const scrollToIndex = useCallback(
    (index: number) => {
      if (containerRef.current) {
        const newIndex = Math.max(0, Math.min(index, events.length - 1));

        let scrollAmount;
        if (isMobile) {
          // For mobile: exact positioning with proper centering
          scrollAmount = newIndex * containerRef.current.offsetWidth;
        } else {
          // For desktop: adjust for the smaller gap
          scrollAmount = newIndex * (itemWidth + 8); // Match the gap value used in layout
        }

        containerRef.current.scrollTo({
          left: scrollAmount,
          behavior: 'smooth',
        });

        setActiveItemIndex(newIndex);
      }
    },
    [events.length, isMobile, itemWidth],
  );

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

  // Touch handling for mobile with enhanced snap behavior
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

  // Touch handling for mobile with enhanced snap behavior
  const handleTouchEnd = () => {
    setIsDragging(false);
    if (containerRef.current) {
      // For mobile, find the closest item
      if (isMobile) {
        const scrollPosition = containerRef.current.scrollLeft;
        const containerWidth = containerRef.current.offsetWidth;
        const newIndex = Math.round(scrollPosition / containerWidth);
        scrollToIndex(newIndex);
      } else {
        // For desktop: use the smaller gap
        const newIndex = Math.round(containerRef.current.scrollLeft / (itemWidth + 8));
        scrollToIndex(newIndex);
      }
    }
  };

  // Auto-play functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (autoplay && !isHovering && events.length > 1) {
      interval = setInterval(() => {
        if (activeItemIndex >= events.length - 1) {
          scrollToIndex(0);
        } else {
          scrollToIndex(activeItemIndex + 1);
        }
      }, autoplayInterval);
    }

    return () => clearInterval(interval);
  }, [autoplay, autoplayInterval, activeItemIndex, isHovering, events.length, scrollToIndex]);

  // Scroll event listener to update active index
  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current && !isDragging) {
        if (isMobile) {
          // For mobile: each item is exactly one screen width
          const scrollPosition = containerRef.current.scrollLeft;
          const containerWidth = containerRef.current.offsetWidth;
          const newIndex = Math.min(Math.max(0, Math.round(scrollPosition / containerWidth)), events.length - 1);
          setActiveItemIndex(newIndex);
        } else {
          // For desktop: use the smaller gap value
          const newIndex = Math.min(
            Math.max(0, Math.round(containerRef.current.scrollLeft / (itemWidth + 8))),
            events.length - 1,
          );
          setActiveItemIndex(newIndex);
        }
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [isDragging, events.length, isMobile, itemWidth]);

  // Show arrows when container is hovered
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowArrows(isHovering);
    }, 200);

    return () => clearTimeout(timer);
  }, [isHovering]);

  // Initial setup for mobile
  useEffect(() => {
    if (containerRef.current) {
      // Resize handler to maintain layout when window size changes
      const handleResize = () => {
        setItemsPerView(getItemsPerView());

        if (isMobile) {
          scrollToIndex(activeItemIndex);
        }
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isMobile, scrollToIndex, activeItemIndex, getItemsPerView]);

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
          <Button endIcon={<ArrowForward />} color="secondary" component={Link} href="/events">
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
                  backgroundColor: theme => alpha(theme.palette.secondary.main, 0.08),
                },
              }}
            >
              <KeyboardArrowLeft />
            </IconButton>
            <IconButton
              onClick={handleNext}
              disabled={activeItemIndex >= events.length - 1}
              color="secondary"
              sx={{
                borderRadius: '50%',
                backgroundColor: theme => theme.palette.background.paper,
                boxShadow: 1,
                '&:hover': {
                  backgroundColor: theme => alpha(theme.palette.secondary.main, 0.08),
                },
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
          borderRadius: 2,
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
            disabled={activeItemIndex >= events.length - 1}
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
              opacity: activeItemIndex >= events.length - 1 ? 0.5 : 1,
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
            gap: isMobile ? 0 : 1, // Reduced gap on desktop, none on mobile
            padding: isMobile ? 0 : 2, // No padding on mobile
            paddingBottom: showIndicators ? 3 : 2,
            '&::-webkit-scrollbar': { display: 'none' },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
            cursor: isDragging ? 'grabbing' : 'grab',
            width: '100%',
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
            <Box
              key={index}
              data-carousel-item
              sx={{
                flex: '0 0 auto',
                width: isMobile ? '100%' : `${itemWidth}px`, // Match desktop width to the itemWidth prop
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                scrollSnapAlign: isMobile ? 'center' : 'start',
                padding: isMobile ? 2 : 0, // Add padding inside the container on mobile
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  width: '100%', // Full width of the parent container
                  maxWidth: '100%',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  transform: activeItemIndex === index ? 'scale(1.01)' : 'scale(1)',
                  boxShadow: activeItemIndex === index ? 3 : 1,
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <EventBoxSm event={event} />
              </Paper>
            </Box>
          ))}
        </Box>

        {/* Improved Page Indicators */}
        {showIndicators && events.length > 1 && (
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
            {/* Show indicators for all items, not just scrollable items */}
            {events.map((_, index) => (
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
                    color: activeItemIndex === index ? 'secondary.main' : alpha(theme.palette.secondary.main, 0.3),
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
