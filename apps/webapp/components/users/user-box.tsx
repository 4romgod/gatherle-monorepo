import { Typography, Grid, Avatar, Box } from '@mui/material';
import { Person } from '@mui/icons-material';
import { UserType } from '@/data/graphql/types/graphql';
import Link from 'next/link';

export default function UserBox({ user }: { user: UserType }) {
  return (
    <Grid item xs={12} sm={6} md={4} style={{ marginBottom: '1rem' }}>
      <Link href={`/users/${user.username}`}>
        <Box
          display="flex"
          alignItems="center"
          p={2}
          bgcolor="rgba(0, 0, 0, 0.05)"
          border="1px solid rgba(0, 0, 0, 0.1)"
          borderRadius={4}
        >
          <Avatar src={user.profile_picture || '/user-icon.png'} alt={user.username}>
            <Person />
          </Avatar>
          <Box marginLeft={2}>
            <Typography variant="subtitle1">{user.username}</Typography>
            <Typography variant="body2">{user.email}</Typography>
          </Box>
        </Box>
      </Link>
    </Grid>
  );
}
