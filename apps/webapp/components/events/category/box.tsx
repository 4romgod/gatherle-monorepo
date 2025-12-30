import { EventCategory } from '@/data/graphql/types/graphql';
import { getEventCategoryIcon } from '@/lib/constants';
import { Box, Button, Typography } from '@mui/material';
import Link from 'next/link';

export default async function EventCategoryBox({ eventCategory }: { eventCategory: EventCategory }) {
  const IconComponent = getEventCategoryIcon(eventCategory.iconName);

  return (
    <Button
      component={Link}
      href={`/events#${eventCategory.name}`}
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 110,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        position: 'relative',
        backgroundColor: 'background.paper',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 10px 28px rgba(0,0,0,0.08)',
        transition: 'transform 0.3s, box-shadow 0.3s, border-color 0.3s',
        '&:hover': {
          transform: 'translateY(-6px)',
          boxShadow: '0 20px 35px rgba(0,0,0,0.12)',
          borderColor: 'secondary.main',
        },
        p: 1.5,
      }}
    >
      <Box
        sx={{
          fontSize: '2rem',
          mb: 1,
          width: 42,
          height: 42,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.7)',
          marginBottom: 2,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
        }}
      >
        <IconComponent color={eventCategory.color || ''} height={24} width={24} />
      </Box>
      <Typography variant="subtitle1" component="span" fontWeight="medium" color="text.primary">
        {eventCategory.name}
      </Typography>
    </Button>
  );
}
