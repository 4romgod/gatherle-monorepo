import { EventCategoryType } from "@/data/graphql/types/graphql";
import { getEventCategoryIcon } from "@/lib/constants";
import { Box, Button, Typography } from "@mui/material";
import Link from 'next/link';

export default async function EventCategoryBox({ eventCategory }: { eventCategory: EventCategoryType }) {
  const IconComponent = getEventCategoryIcon(eventCategory.iconName);

  return (
    <Button
      component={Link}
      href={`/events#${eventCategory.name}`}
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 140,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        backgroundColor: 'background.default',
        borderRadius: 2,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        transition: 'transform 0.3s, box-shadow 0.3s',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: '0 8px 15px rgba(0,0,0,0.1)',
          backgroundColor: 'secondary.light'
        },
        p: 2
      }}
    >
      <Box
        sx={{
          fontSize: '2rem',
          mb: 1,
          width: 50,
          height: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          backgroundColor: 'rgba(0,0,0,0.04)',
          marginBottom: 2
        }}
      >
        <IconComponent
          color={eventCategory.color || ''}
          height={24}
          width={24}
        />
      </Box>
      <Typography
        variant="subtitle1"
        component="span"
        fontWeight="medium"
        color="text.primary"
      >
        {eventCategory.name}
      </Typography>
    </Button>
  )
}