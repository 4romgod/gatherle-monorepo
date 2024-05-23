'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EventCategoryType } from '@/data/graphql/types/graphql';
import { Box, Stack, Typography } from '@mui/material';
import DropDown from '@/components/drop-down';
import EventCategoryComponent from '@/components/events/event-category';

export default function DisplayEventFilters({ categoryList }: { categoryList: EventCategoryType[] }) {
  const [selectedItem, setSelectedItem] = useState<string>('');
  const router = useRouter();

  const onSelectChangeHandler = (event: any) => {
    const selectedItemName = event.target.textContent;
    setSelectedItem(selectedItemName);
    const selectedItem = categoryList.find((item) => item.name === selectedItemName);

    if (selectedItem && selectedItem.name) {
      router.push(`#${selectedItem.name}`);
    }
  };

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
      <Box id="filters-desktop" component="div" sx={{ display: { xs: 'none', md: 'block' }, width: '100%' }}>
        <Typography variant="h5" className="mb-3">
          Categories
        </Typography>
        {categoryList.map((category) => (
          <EventCategoryComponent key={category.id} eventCategory={category} onClick={onSelectChangeHandler} />
        ))}
      </Box>
    </Box>
  );
}
