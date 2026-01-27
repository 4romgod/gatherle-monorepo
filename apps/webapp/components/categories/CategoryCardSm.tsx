'use client';
import Link from 'next/link';
import { alpha, Box, Button, Typography } from '@mui/material';
import { EventCategory } from '@/data/graphql/types/graphql';
import { getEventCategoryIcon } from '@/lib/constants';

export default function CategoryCardSm({ eventCategory }: { eventCategory: EventCategory }) {
  const IconComponent = getEventCategoryIcon(eventCategory.iconName);

  return (
    <Button
      component={Link}
      href={`/categories/${eventCategory.slug}`}
      sx={(theme) => ({
        width: '100%',
        height: '100%',
        minHeight: 110,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        position: 'relative',
        backgroundColor: theme.palette.background.paper,
        borderRadius: 3,
        border: '1px solid',
        borderColor: theme.palette.divider,
        boxShadow: theme.shadows[0],
        transition: 'transform 0.3s, box-shadow 0.3s, border-color 0.3s',
        '&:hover': {
          boxShadow: theme.shadows[4],
          borderColor: 'secondary.main',
        },
        p: 1.5,
      })}
    >
      <Box
        sx={(theme) => ({
          fontSize: '2rem',
          mb: 1,
          width: 42,
          height: 42,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          backgroundColor: alpha(theme.palette.common.white, 0.7),
          marginBottom: 2,
          boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.6)}`,
        })}
      >
        <IconComponent color={eventCategory.color || ''} height={24} width={24} />
      </Box>
      <Typography variant="subtitle1" component="span" fontWeight="medium" color="text.primary">
        {eventCategory.name}
      </Typography>
    </Button>
  );
}
