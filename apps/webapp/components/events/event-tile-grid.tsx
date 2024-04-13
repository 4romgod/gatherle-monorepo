import React from 'react';
import { Typography, Grid } from '@mui/material';
import EventSmallBox from '@/components/events/event-small-box';
import { Event } from '@/lib/graphql/types/graphql';

export type EventTileGridProps = {
  eventsByCategory: {
    [category: string]: Event[];
  };
};

export default function EventTileGrid({
  eventsByCategory,
}: EventTileGridProps) {
  return (
    <>
      {Object.keys(eventsByCategory).map((categoryName) => (
        <div key={categoryName}>
          <Typography variant="h4" gutterBottom id={categoryName}>
            {categoryName}
          </Typography>
          <Grid container spacing={5}>
            {eventsByCategory[categoryName].map((event) => (
              <Grid
                item
                key={`EventTileGrid.${categoryName}.${event.id}`}
                xs={12}
                sm={6}
                md={4}
                lg={3}
              >
                <EventSmallBox event={event} />
              </Grid>
            ))}
          </Grid>
        </div>
      ))}
    </>
  );
}
