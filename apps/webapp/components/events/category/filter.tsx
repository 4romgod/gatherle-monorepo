import { EventCategory } from '@/data/graphql/types/graphql';
import { getEventCategoryIcon } from '@/lib/constants';
import { Box, Typography } from '@mui/material';
import { MouseEventHandler } from 'react';

export default function EventCategoryFilter({
  eventCategory,
  onClick,
}: {
  eventCategory: EventCategory;
  onClick?: MouseEventHandler<HTMLDivElement>;
}) {
  const IconComponent = getEventCategoryIcon(eventCategory.iconName);

  return (
    <Box
      component="div"
      onClick={onClick}
      sx={{
        display: 'flex',
        px: 2,
      }}
    >
      <IconComponent
        color={eventCategory.color || ''}
        height={24}
        width={24}
      />
      <Typography variant='body1' pl={1}>{eventCategory.name}</Typography>
    </Box>
  );
};
