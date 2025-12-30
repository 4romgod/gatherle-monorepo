import { EventCategory } from '@/data/graphql/types/graphql';
import { getEventCategoryIcon } from '@/lib/constants';
import { Avatar, Chip } from '@mui/material';
import Link from 'next/link';

export default function EventCategoryChip({ category }: { category: EventCategory }) {
  const IconComponent = getEventCategoryIcon(category.iconName);
  return (
    <Link key={category.eventCategoryId} href={`/events#${category.name}`} passHref style={{ margin: 5 }}>
      <Chip
        avatar={
          <Avatar>
            <IconComponent color={category.color ?? 'black'} />
          </Avatar>
        }
        label={category.name}
        variant="outlined"
        color="secondary"
        size="medium"
        clickable
      />
    </Link>
  );
}
