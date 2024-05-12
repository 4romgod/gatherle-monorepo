'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import { CardActionArea } from '@mui/material';
import { EventType } from '@/lib/graphql/types/graphql';
import { Box } from '@mui/material';
import Link from 'next/link';
import { CalendarIcon, CheckCircleIcon, TicketIcon, UserIcon } from '@heroicons/react/24/outline';
import { kebabCase } from 'lodash';

export default function EventBoxMobile({ event }: { event: EventType }) {
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
      <Card>
        <CardActionArea>
          <CardMedia component="img" height="40" sx={{ height: 220 }} image={featuredImageUrl} alt="green iguana" />
          <CardContent>
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
        </CardActionArea>
      </Card>
    </Link>
  );
}
