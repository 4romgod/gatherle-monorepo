import { EventCategory } from '@/lib/graphql/types/graphql';
import { getEventCategoryIcon } from '@/lib/constants';
import { Box, Typography } from '@mui/material';

export default function EventCategoryComponent({
  eventCategory,
}: {
  eventCategory: EventCategory;
}) {
  const IconComponent = getEventCategoryIcon(eventCategory.iconName);

  return (
    <Box component="div" className="flex items-center space-x-2">
      <IconComponent className="h-6 w-6" />
      <Typography className="p">{eventCategory.name}</Typography>
    </Box>
  );
}
