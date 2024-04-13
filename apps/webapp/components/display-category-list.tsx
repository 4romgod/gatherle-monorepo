'use client';

import DropDown from './drop-down';
import EventCategoryComponent from './events/event-category';
import { Box, Grid, Typography } from '@mui/material';
import { EventCategory } from '@/lib/graphql/types/graphql';

export default function DisplayCategoryList({
  categoryList,
}: {
  categoryList: EventCategory[];
}) {
  return (
    <Grid item xs={12} lg={4}>
      <Box component="div" className="flex flex-col">
        <Box component="div" className="lg:hidden">
          <DropDown
            defaultItem={'Any Category'}
            itemList={categoryList}
            renderItem={(category) => {
              return <EventCategoryComponent eventCategory={category} />;
            }}
          />
        </Box>
        <Box component="div" className="hidden lg:block">
          <Typography variant="h2" className="mb-3">
            Categories
          </Typography>
          {categoryList.map((category) => (
            <EventCategoryComponent
              key={category.id}
              eventCategory={category}
            />
          ))}
        </Box>
      </Box>
    </Grid>
  );
}
