'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography, IconButton, useMediaQuery, useTheme, Stack, Button, ButtonProps } from '@mui/material';
import { ChevronLeft, ChevronRight, ArrowForward } from '@mui/icons-material';
import Link from 'next/link';

interface CarouselViewAllButtonProps {
  href: string;
  label?: string;
  color?: ButtonProps['color'];
  variant?: ButtonProps['variant'];
  target?: string;
  rel?: string;
}

export interface CarouselProps<T> {
  items: T[];
  title?: string;
  autoplay?: boolean;
  autoplayInterval?: number;
  itemWidth?: number;
  showIndicators?: boolean;
  viewAllButton?: CarouselViewAllButtonProps;
  renderItem: (item: T, index: number) => React.ReactNode;
  itemKey?: (item: T, index: number) => React.Key;
  itemWrapper?: (content: React.ReactNode, item: T, index: number) => React.ReactNode;
}

export default function Carousel<T>({
  items,
  title,
  autoplay = false,
  autoplayInterval = 4000,
  itemWidth = 350,
  showIndicators = true,
  viewAllButton,
  renderItem,
  itemKey,
  itemWrapper,
}: CarouselProps<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const checkScrollPosition = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

    if (isMobile) {
      const index = Math.round(scrollLeft / clientWidth);
      setCurrentIndex(index);
    }
  }, [isMobile]);

  useEffect(() => {
    checkScrollPosition();
    const container = containerRef.current;
    if (!container) return undefined;

    container.addEventListener('scroll', checkScrollPosition);
    return () => container.removeEventListener('scroll', checkScrollPosition);
  }, [checkScrollPosition, items.length]);

  useEffect(() => {
    const handleResize = () => checkScrollPosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkScrollPosition]);

  const scroll = useCallback(
    (direction: 'left' | 'right') => {
      if (!containerRef.current) return;
      const scrollAmount = isMobile ? containerRef.current.clientWidth : itemWidth + 24;
      containerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    },
    [isMobile, itemWidth],
  );

  useEffect(() => {
    if (!autoplay || items.length <= 1 || typeof window === 'undefined') return;
    const intervalId = window.setInterval(() => scroll('right'), autoplayInterval);
    return () => window.clearInterval(intervalId);
  }, [autoplay, autoplayInterval, items.length, scroll]);

  if (items.length === 0) {
    return null;
  }

  const defaultItemWrapper: NonNullable<CarouselProps<T>['itemWrapper']> = (
    content: React.ReactNode,
    _item?: T,
    _index?: number,
  ) => <>{content}</>;

  const renderWrappedItem = (item: T, index: number) => {
    const content = renderItem(item, index);
    const wrapper = itemWrapper ?? defaultItemWrapper;
    return wrapper(content, item, index);
  };

  const getKey = (item: T, index: number) => (itemKey ? itemKey(item, index) : index);

  return (
    <Box sx={{ width: '100%' }}>
      {(title || viewAllButton) && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          {title && (
            <Typography variant="h5" fontWeight={700}>
              {title}
            </Typography>
          )}
          {viewAllButton && (
            <Button
              endIcon={<ArrowForward />}
              color={viewAllButton.color ?? 'secondary'}
              variant={viewAllButton.variant ?? 'text'}
              component={Link}
              href={viewAllButton.href}
              target={viewAllButton.target}
              rel={viewAllButton.rel}
              size="small"
            >
              {viewAllButton.label ?? 'View all'}
            </Button>
          )}
        </Stack>
      )}

      <Box sx={{ position: 'relative' }}>
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
          {items.map((item, index) => (
            <Box
              key={getKey(item, index)}
              sx={{
                flex: '0 0 auto',
                width: isMobile ? '100%' : itemWidth,
                scrollSnapAlign: 'start',
              }}
            >
              {renderWrappedItem(item, index)}
            </Box>
          ))}
        </Box>

        {showIndicators && isMobile && items.length > 1 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 1,
              mt: 2,
            }}
          >
            {items.map((_, index) => (
              <Box
                key={index}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: currentIndex === index ? 'primary.main' : 'action.disabled',
                  transition: 'background-color 0.3s',
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
