import React from 'react';
import { Typography, Grid, Box } from '@mui/material';
import { Event } from '@/data/graphql/types/graphql';
import EventBox from '@/components/events/event-box';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';

export type EventTileGridProps = {
  eventsByCategory: {
    [category: string]: Event[];
  };
};

export default function EventTileGrid({ eventsByCategory }: EventTileGridProps) {
  return (
    <>
      {Object.keys(eventsByCategory).map((categoryName) => (
        <Box component="div" key={categoryName} mb={6}>
          <Typography variant="h4" gutterBottom id={categoryName}>
            {categoryName}
          </Typography>
          <Grid container spacing={1.5}>
            {eventsByCategory[categoryName].map((event) => (
              <Grid size={{ xs: 12 }} key={`EventTileGrid.${categoryName}.${event.eventId}`}>
                <Box component="div">
                  <Link href={ROUTES.EVENTS.EVENT(event.slug)}>
                    <EventBox event={event} />
                  </Link>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </>
  );
}
