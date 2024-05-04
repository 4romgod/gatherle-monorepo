import React from 'react';
import { Typography, Grid, Box } from '@mui/material';
import { EventType } from '@/lib/graphql/types/graphql';
import EventBoxMobile from '@/components/events/event-box/desktop';
import EventBoxDesktop from '@/components/events/event-box/mobile';

export type EventTileGridProps = {
  eventsByCategory: {
    [category: string]: EventType[];
  };
};

export default function EventTileGrid({ eventsByCategory }: EventTileGridProps) {
  return (
    <>
      {Object.keys(eventsByCategory).map((categoryName) => (
        <Box component="div" key={categoryName} marginBottom={10}>
          <Typography variant="h4" gutterBottom id={categoryName}>
            {categoryName}
          </Typography>
          <Grid container spacing={5}>
            {eventsByCategory[categoryName].map((event) => (
              <Grid item key={`EventTileGrid.${categoryName}.${event.id}`} xs={12} sm={6}>
                <Box component="div" sx={{ display: { xs: 'none', md: 'block' } }}>
                  <EventBoxMobile event={event} />
                </Box>
                <Box component="div" sx={{ display: { md: 'none' } }}>
                  <EventBoxDesktop event={event} />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </>
  );
}
