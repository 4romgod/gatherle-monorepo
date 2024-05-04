import { EventCategoryType } from '@/lib/graphql/types/graphql';
import { getEventCategoryIcon } from '@/lib/constants';
import { Box, Typography } from '@mui/material';
import { MouseEventHandler } from 'react';

export default function EventCategoryComponent({
  eventCategory,
  onClick,
}: {
  eventCategory: EventCategoryType;
  onClick?: MouseEventHandler<HTMLDivElement>;
}) {
  const IconComponent = getEventCategoryIcon(eventCategory.iconName);

  return (
    <Box component="div" className="flex items-center space-x-2" onClick={onClick}>
      <IconComponent className="h-6 w-6" />
      <Typography className="p">{eventCategory.name}</Typography>
    </Box>
  );
}
