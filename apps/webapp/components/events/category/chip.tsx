import { EventCategory } from '@/data/graphql/types/graphql';
import { getEventCategoryIcon } from '@/lib/constants';
import { Avatar, Chip, alpha } from '@mui/material';
import Link from 'next/link';

export default function EventCategoryChip({ category }: { category: EventCategory }) {
  const IconComponent = getEventCategoryIcon(category.iconName);
  const categoryColor = category.color ?? 'black';
  
  return (
    <Link key={category.eventCategoryId} href={`/events#${category.name}`} passHref style={{ textDecoration: 'none' }}>
      <Chip
        avatar={
          <Avatar sx={{ bgcolor: alpha(categoryColor, 0.12) }}>
            <IconComponent color={categoryColor} width={20} height={20} />
          </Avatar>
        }
        label={category.name}
        variant="outlined"
        size="medium"
        clickable
        sx={{
          borderColor: category.color ?? 'secondary.main',
          color: category.color ?? 'text.primary',
          '&:hover': {
            borderColor: category.color ?? 'secondary.main',
            bgcolor: alpha(categoryColor, 0.06),
          },
          fontWeight: 500,
          margin: 0.5,
        }}
      />
    </Link>
  );
}
