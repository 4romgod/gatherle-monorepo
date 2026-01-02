import { Person, Email, Phone, Public, Visibility, Share, CheckCircle } from '@mui/icons-material';
import { Typography, Avatar, Box, Paper, Chip, Divider, Stack } from '@mui/material';
import { MapPinIcon } from '@heroicons/react/24/solid';
import { User, SocialVisibility } from '@/data/graphql/types/graphql';
import EventCategoryChip from '@/components/events/category/chip';

interface UserDetailsProps {
  user: User;
  isOwnProfile?: boolean;
}

export default function UserDetails({ user, isOwnProfile = false }: UserDetailsProps) {
  // Determine what contact information to show based on privacy settings
  const showContactInfo = isOwnProfile || user.socialVisibility === SocialVisibility.Public;
  const showEmail = isOwnProfile; // Email should only be visible to profile owner
  const showPhone = isOwnProfile; // Phone should only be visible to profile owner
  return (
    <Paper
      component="div"
      sx={{
        backgroundColor: 'background.default',
        borderRadius: '12px',
        p: 3,
      }}
    >
      <Box component="div" sx={{ position: 'relative', mb: 3 }}>
        {user.profile_picture ? (
          <Avatar
            variant="square"
            src={user.profile_picture}
            alt={user.username}
            sx={{
              width: '100%',
              height: '100%',
              borderRadius: '7px',
            }}
          />
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
            position: 'absolute',
            bottom: '5%',
            left: '5%',
          }}
        >
          <Typography variant="h5" fontWeight="bold" color="white">
            {`${user.given_name} ${user.family_name}`}
          </Typography>
          {user.address && (
            <Box component="div" sx={{ display: 'flex', flexDirection: 'row', marginTop: 1 }}>
              <MapPinIcon color="white" height={20} width={20} />
              <Typography variant="subtitle2" color="white" paddingLeft={1}>
                {`${user.address.city}, ${user.address.state}, ${user.address.country}`}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Username and Roles */}
      <Box mb={2}>
        <Typography variant="body2" color="text.secondary">
          @{user.username}
        </Typography>
        {user.roles && user.roles.length > 0 && (
          <Stack direction="row" spacing={1} mt={1}>
            {user.roles.map((role) => (
              <Chip key={role} label={role} size="small" color="primary" variant="outlined" />
            ))}
          </Stack>
        )}
      </Box>

      {/* Bio */}
      {user.bio && (
        <Box mb={2}>
          <Typography variant="h6" gutterBottom>
            About Me
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user.bio}
          </Typography>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Contact Info - respects privacy settings */}
      {showContactInfo && (
        <Box mb={2}>
          <Typography variant="h6" gutterBottom>
            Contact
          </Typography>
          <Stack spacing={1}>
            {showEmail && (
              <Box display="flex" alignItems="center" gap={1}>
                <Email fontSize="small" color="action" />
                <Typography variant="body2">{user.email}</Typography>
              </Box>
            )}
            {showPhone && user.phone_number && (
              <Box display="flex" alignItems="center" gap={1}>
                <Phone fontSize="small" color="action" />
                <Typography variant="body2">{user.phone_number}</Typography>
              </Box>
            )}
            {user.primaryTimezone && (
              <Box display="flex" alignItems="center" gap={1}>
                <Public fontSize="small" color="action" />
                <Typography variant="body2">{user.primaryTimezone}</Typography>
              </Box>
            )}
          </Stack>
        </Box>
      )}

      {/* Social Preferences - only show to profile owner */}
      {isOwnProfile && (user.socialVisibility || user.shareRSVPByDefault !== undefined || user.shareCheckinsByDefault !== undefined) && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box mb={2}>
            <Typography variant="h6" gutterBottom>
              Privacy
            </Typography>
            <Stack spacing={1}>
              {user.socialVisibility && (
                <Box display="flex" alignItems="center" gap={1}>
                  <Visibility fontSize="small" color="action" />
                  <Typography variant="body2">Profile: {user.socialVisibility}</Typography>
                </Box>
              )}
              {user.shareRSVPByDefault && (
                <Box display="flex" alignItems="center" gap={1}>
                  <Share fontSize="small" color="action" />
                  <Typography variant="body2">Shares RSVPs by default</Typography>
                </Box>
              )}
              {user.shareCheckinsByDefault && (
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircle fontSize="small" color="action" />
                  <Typography variant="body2">Shares check-ins by default</Typography>
                </Box>
              )}
            </Stack>
          </Box>
        </>
      )}

      {/* Interests */}
      {user.interests && user.interests.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box>
            <Typography variant="h6" gutterBottom>
              Interests
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {user.interests.map((category, index) => (
                <EventCategoryChip key={`${category.eventCategoryId || index}`} category={category} />
              ))}
            </Stack>
          </Box>
        </>
      )}
    </Paper>
  );
}
