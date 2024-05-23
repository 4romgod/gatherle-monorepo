'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import { EventType } from '@/data/graphql/types/graphql';
import Link from 'next/link';
import { CalendarIcon, CheckCircleIcon, TicketIcon, UserIcon } from '@heroicons/react/24/outline';
import { kebabCase } from 'lodash';

export default function EventBoxDesktop({ event }: { event: EventType }) {
  const {
    title,
    organizers,
    startDate,
    rSVPs,
    media: { featuredImageUrl },
  } = event;

  const organizersText = organizers?.map((user) => user.username).join(' and ') ?? '';
  const eventSlug = kebabCase(title);

  return (
    <Link href={`/events/${eventSlug}`}>
      <Card sx={{ display: 'flex' }}>
        <CardMedia
          component="img"
          sx={{ width: { md: 123, lg: 145, xl: 156 } }}
          image={featuredImageUrl}
          alt="Live from space album cover"
        />
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ flex: '1 0 auto' }}>
            <Box component="div">
              <h4 className="text-xl font-bold">{title}</h4>
            </Box>
            <Box component="div" className="flex flex-row">
              <UserIcon className="mr-2 h-6 w-5" />
              <p className="text-base">{organizersText}</p>
            </Box>
            <Box component="div" className="flex flex-row">
              <CalendarIcon className="mr-2 h-6 w-5" />
              <p>{startDate}</p>
            </Box>
            <Box component="div" className="flex flex-row">
              <CheckCircleIcon className="mr-2 h-6 w-5" />
              <p>{rSVPs.length ?? 0} RSVP&lsquo;s</p>
            </Box>
            <Box component="div" className="flex flex-row">
              <TicketIcon className="mr-2 h-6 w-5" />
              <p>Free</p>
            </Box>
          </CardContent>
        </Box>
      </Card>
    </Link>
  );
}
