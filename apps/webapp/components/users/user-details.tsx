import { Person } from '@mui/icons-material';
import { Typography, Avatar, Box, Paper } from '@mui/material';
import { MapPinIcon } from '@heroicons/react/24/solid';
import { User } from '@/data/graphql/types/graphql';

export default function UserDetails({ user }: { user: User }) {
  return (
    <Paper
      component="div"
      sx={{
        backgroundColor: 'background.default',
        borderRadius: '12px',
        p: 3
      }}
    >
      <Box component="div" sx={{ position: 'relative' }}>
        {user.profile_picture ? (
          <Avatar
            variant='square'
            src={user.profile_picture}
            alt={user.username}
            sx={{
              width: '100%',
              height: '100%',
              borderRadius: '7px',
            }} />
        ) : (
          <Person
            sx={{
              width: '100%',
              height: '100%',
            }}
          />
        )}
        <Box
          component="div"
          sx={{
            position: "absolute",
            bottom: '5%',
            left: "5%",
          }}
        >
          <Typography variant="h5" fontWeight="bold" color="white">
            {`${user.given_name} ${user.family_name}`}
          </Typography>
          <Box component="div" sx={{ display: 'flex', flexDirection: 'row', marginTop: 1 }}>
            <MapPinIcon color="white" height={20} width={20} />
            <Typography variant='subtitle2' color="white" paddingLeft={1}>{user.address}</Typography>
          </Box>
        </Box>
      </Box>
      <Box marginTop={3}>
        <Typography variant="h6">
          About Me
        </Typography>
        <Typography variant="body1">
          Lorem ipsum dolor, sit amet consectetur adipisicing elit. Atque exercitationem, repellat vitae possimus facere sed recusandae quia
        </Typography>
      </Box>
    </Paper>
  )
};
