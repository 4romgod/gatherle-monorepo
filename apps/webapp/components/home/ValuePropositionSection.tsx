'use client';

import { Box, Button, Typography } from '@mui/material';
import Link from 'next/link';
import { ROUTES, APP_NAME } from '@/lib/constants';
import { WEB_RADIUS } from '@/lib/constants/radius';

export default function ValuePropositionSection() {
  return (
    <Box id="value-proposition" component="section">
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: WEB_RADIUS.panel,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          px: { xs: 3, md: 5 },
          py: { xs: 3.5, md: 4.5 },
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            maxWidth: 700,
            mx: 'auto',
          }}
        >
          <Typography
            variant="overline"
            sx={{
              color: 'secondary.main',
              fontWeight: 700,
              letterSpacing: '0.14em',
            }}
          >
            DISCOVER, HOST, CONNECT
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              mt: 1.5,
              fontSize: { xs: '1.5rem', md: '2rem' },
            }}
          >
            Build, discover, and celebrate events with intention.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2.5 }}>
            {APP_NAME} surfaces meaningful gatherings, gives hosts polish in minutes, and keeps every RSVP in sync with
            the people who care about shows, meals, activations, and after-hours sessions.
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            component={Link}
            href={ROUTES.AUTH.REGISTER}
            sx={{ borderRadius: WEB_RADIUS.control, mt: 3, px: 3, py: 1.25, fontWeight: 700 }}
          >
            Join {APP_NAME}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
