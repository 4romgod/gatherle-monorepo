'use client';

import Link from 'next/link';
import { Groups } from '@mui/icons-material';
import { alpha, Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { EventCategory } from '@/data/graphql/types/graphql';
import { getEventCategoryIcon } from '@/lib/constants';
import { ROUTES } from '@/lib/constants';

type CategoryCardProps = {
  category: EventCategory;
};

export default function CategoryCard({ category }: CategoryCardProps) {
  const IconComponent = getEventCategoryIcon(category.iconName);
  const categoryColor = category.color ?? 'text.primary';
  const membersCount = category.interestedUsersCount ?? 0;
  const formattedMembersCount = membersCount.toLocaleString();

  return (
    <Link
      href={ROUTES.CATEGORIES.CATEGORY(category.slug)}
      title={`View ${category.name} events`}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <Paper
        component="article"
        variant="outlined"
        sx={(theme) => ({
          p: 3,
          borderRadius: 3,
          height: '100%',
          borderColor: theme.palette.mode === 'dark' ? theme.palette.divider : alpha(categoryColor, 0.35),
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          backgroundColor: theme.palette.background.paper,
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: theme.shadows[4],
            transform: 'translateY(-2px)',
          },
        })}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: alpha(categoryColor, 0.16),
              color: categoryColor,
              border: `1px solid ${alpha(categoryColor, 0.4)}`,
            }}
          >
            <IconComponent width={20} height={20} />
          </Box>
          <Typography variant="h6" fontWeight={600} sx={{ color: 'text.primary' }}>
            {category.name}
          </Typography>
        </Stack>
        <Box>
          <Chip
            icon={<Groups fontSize="small" />}
            label={`${formattedMembersCount} ${membersCount === 1 ? 'member' : 'members'}`}
            size="small"
            sx={{
              borderRadius: 2,
              bgcolor: 'action.selected',
              color: 'text.primary',
              fontWeight: 600,
            }}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ minHeight: 48 }}>
          {category.description || 'Explore events in this category.'}
        </Typography>
      </Paper>
    </Link>
  );
}
