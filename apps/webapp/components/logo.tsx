import { useRouter } from 'next/navigation';
import { Typography } from '@mui/material';

export default function Logo() {
  const router = useRouter();

  return (
    <a style={{ alignItems: 'center', display: 'flex', justifyContent: 'center' }} onClick={() => router.push('/')}>
      <Typography
        variant="h5"
        noWrap
        color="primary"
        sx={{
          mx: 2,
          display: { md: 'flex' },
          fontFamily: 'monospace',
          fontWeight: 700,
          letterSpacing: '.3rem',
          textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        {'ntlango'}
      </Typography>
    </a>
  );
}
