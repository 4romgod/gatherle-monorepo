import { Box, Typography } from '@mui/material';
import Link from 'next/link';
import React from 'react';

export type EventLinkBoxProps = {
  href: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  color?: 'amber' | 'brand' | 'blue';
};

const EventAdvertBox = ({
  href,
  title,
  description,
  icon,
  color = 'amber',
}: EventLinkBoxProps) => {
  const colors = {
    amber:
      'bg-amber-400 dark:bg-scale-100 group-hover:bg-amber-500 dark:group-hover:bg-amber-300 text-amber-900',
    blue: 'bg-blue-400 dark:bg-scale-100 group-hover:bg-blue-500 dark:group-hover:bg-blue-300 text-blue-900',
    brand:
      'bg-brand-400 dark:bg-scale-100 group-hover:bg-brand-500 dark:group-hover:bg-brand-300 text-brand-900',
  };

  return (
    <Link href={href}>
      <Box
        component="div"
        className={`
          hover:bg-scale-300
          bg-scale-200
          border-scale-500
          dark:border-scale-400 group cursor-pointer rounded 
          border px-5 py-4`}
      >
        <Box component="div" className="flex flex-col gap-3">
          <Box
            component="div"
            className={`${colors[color]}
              flex h-8 w-8
              items-center justify-center rounded-md
              transition-all
              group-hover:scale-110`}
          >
            {icon}
          </Box>
          <Box component="div">
            <Typography variant="h5" className="mb-2">
              {title}
            </Typography>
            <Typography className="p">{description}</Typography>
          </Box>
        </Box>
      </Box>
    </Link>
  );
};

export default EventAdvertBox;
