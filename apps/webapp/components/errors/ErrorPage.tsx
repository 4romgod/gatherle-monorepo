import Link from 'next/link';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { ROUTES } from '@/lib/constants';

interface ErrorPageProps {
  statusCode: number | string;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaOnClick?: () => void;
}

export default function ErrorPage({
  statusCode,
  title,
  message,
  ctaLabel = 'Return home',
  ctaHref = ROUTES.ROOT,
  ctaOnClick,
}: ErrorPageProps) {
  return (
    <Box
      component="section"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Stack spacing={3} alignItems="center" sx={{ textAlign: 'center' }}>
          <Typography variant="h1" fontSize={{ xs: '4rem', md: '5rem' }} fontWeight={800}>
            {statusCode}
          </Typography>
          <Typography variant="h4" fontWeight={700}>
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {message}
          </Typography>
          <Button
            variant="contained"
            size="large"
            {...(ctaOnClick ? { onClick: ctaOnClick } : { component: Link, href: ctaHref })}
          >
            {ctaLabel}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
