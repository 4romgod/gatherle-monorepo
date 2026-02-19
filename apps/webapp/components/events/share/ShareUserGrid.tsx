import { Avatar, Badge, Box, CircularProgress, Typography } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { getDisplayName, getInitial, type ShareUser } from './share-utils';

interface ShareUserGridProps {
  users: ShareUser[];
  loading: boolean;
  searchValue: string;
  selectedUserIds: Set<string>;
  sentUserIds: Set<string>;
  onToggleUser: (userId: string) => void;
}

export default function ShareUserGrid({
  users,
  loading,
  searchValue,
  selectedUserIds,
  sentUserIds,
  onToggleUser,
}: ShareUserGridProps) {
  if (loading) {
    return (
      <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={26} />
      </Box>
    );
  }

  if (users.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
        {searchValue.trim() ? 'No users found.' : 'No users to share with yet.'}
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(4, 1fr)' },
        gap: 1.75,
      }}
    >
      {users.map((user) => {
        const selected = selectedUserIds.has(user.userId);
        const wasSent = sentUserIds.has(user.userId);

        return (
          <Box
            key={user.userId}
            onClick={() => onToggleUser(user.userId)}
            sx={{
              cursor: 'pointer',
              textAlign: 'center',
              p: 0.75,
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: selected ? 'primary.main' : 'transparent',
              backgroundColor: selected ? 'action.selected' : 'transparent',
              transition: 'all 0.18s ease',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <Badge
              overlap="circular"
              badgeContent={
                selected ? (
                  <CheckCircle
                    sx={{
                      color: 'primary.main',
                      backgroundColor: 'background.paper',
                      borderRadius: '50%',
                    }}
                  />
                ) : null
              }
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
              <Avatar
                src={user.profile_picture || undefined}
                sx={{
                  width: 66,
                  height: 66,
                  mx: 'auto',
                  border: '2px solid',
                  borderColor: wasSent ? 'primary.main' : 'divider',
                }}
              >
                {getInitial(user)}
              </Avatar>
            </Badge>

            <Typography
              variant="body2"
              sx={{
                mt: 1,
                fontWeight: 500,
                lineHeight: 1.25,
                color: 'text.primary',
                minHeight: 36,
                display: '-webkit-box',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {getDisplayName(user)}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
