'use client';

import { EventCategory } from '@/lib/graphql/types/graphql';
import DropDown from '@/components/drop-down';
import EventCategoryComponent from '@/components/events/event-category';
import { Box, Stack, Typography } from '@mui/material';

export default function DisplayEventFilters({
  categoryList,
}: {
  categoryList: EventCategory[];
}) {
  return (
    <Box component="div" className="flex flex-col">
      <Stack
        id="filters-mobile"
        component="div"
        direction="row"
        spacing={2}
        sx={{
          display: { md: 'none' },
          mx: 'auto',
        }}
      >
        <DropDown
          defaultItem={'Any Category'}
          itemList={categoryList}
          renderItem={(category) => {
            return <EventCategoryComponent eventCategory={category} />;
          }}
        />
        <DropDown
          defaultItem={'Any Category'}
          itemList={categoryList}
          renderItem={(category) => {
            return <EventCategoryComponent eventCategory={category} />;
          }}
        />
      </Stack>
      <Box
        id="filters-desktop"
        component="div"
        sx={{ display: { xs: 'none', md: 'block' }, width: '100%' }}
      >
        <Typography variant="h5" className="mb-3">
          Categories
        </Typography>
        {categoryList.map((category) => (
          <EventCategoryComponent key={category.id} eventCategory={category} />
        ))}

        <Typography variant="h5" className="mb-3">
          Categories
        </Typography>
        {categoryList.map((category) => (
          <EventCategoryComponent key={category.id} eventCategory={category} />
        ))}
      </Box>
    </Box>
  );
}
