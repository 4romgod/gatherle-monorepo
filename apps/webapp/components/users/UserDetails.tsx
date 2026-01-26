import React from 'react';
import { Email, Phone, Public, Visibility, Share, CheckCircle, Cake, Wc } from '@mui/icons-material';
import { Typography, Avatar, Box, Paper, Chip, Stack, Button } from '@mui/material';
import { LocationOn as LocationIcon } from '@mui/icons-material';
import { User, SocialVisibility } from '@/data/graphql/types/graphql';
import EventCategoryBadge from '@/components/categories/CategoryBadge';
import { differenceInYears, format } from 'date-fns';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';

interface UserDetailsProps {
  user: User;
  isOwnProfile?: boolean;
}

const InfoItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 1.5 }}>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        borderRadius: 2,
        bgcolor: 'secondary.main',
        color: 'secondary.contrastText',
      }}
    >
      {icon}
    </Box>
    <Box sx={{ flex: 1 }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value}
      </Typography>
    </Box>
  </Stack>
);

export default function UserDetails({ user, isOwnProfile = false }: UserDetailsProps) {
  // Determine what contact information to show based on privacy settings
  const showContactInfo = isOwnProfile || user.socialVisibility === SocialVisibility.Public;
  const showEmail = isOwnProfile; // Email should only be visible to profile owner
  const showPhone = isOwnProfile; // Phone should only be visible to profile owner

  const age = user.birthdate ? differenceInYears(new Date(), new Date(user.birthdate)) : null;
  const formattedDOB = user.birthdate ? format(new Date(user.birthdate), 'dd MMMM yyyy') : null;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Cover Image */}
      <Box
        sx={{
          height: 200,
          position: 'relative',
          bgcolor: 'primary.main',
        }}
      />

      {/* Profile Section */}
      <Box sx={{ px: 3, pb: 3 }}>
        {/* Avatar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            mt: -8,
            mb: 2,
          }}
        >
          <Avatar
            src={user.profile_picture || undefined}
            alt={`${user.given_name} ${user.family_name}`}
            sx={{
              width: 140,
              height: 140,
              border: '4px solid',
              borderColor: 'background.paper',
              fontSize: '3rem',
            }}
          >
            {user.given_name?.charAt(0)}
            {user.family_name?.charAt(0)}
          </Avatar>
        </Box>

        {/* Name and Username */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            {user.given_name} {user.family_name}
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            @{user.username}
          </Typography>
          {user.userRole && (
            <Chip label={user.userRole} size="small" color="primary" sx={{ mt: 1.5, textTransform: 'capitalize' }} />
          )}
        </Box>

        {/* Bio */}
        {user.bio && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" color="text.secondary">
              {user.bio}
            </Typography>
          </Box>
        )}

        {/* Personal Info */}
        <Stack spacing={0} sx={{ mb: 3 }}>
          {showEmail && <InfoItem icon={<Email fontSize="small" />} label="Email" value={user.email} />}
          {showPhone && user.phone_number && (
            <InfoItem icon={<Phone fontSize="small" />} label="Phone" value={user.phone_number} />
          )}
          {user.location && (
            <InfoItem
              icon={<LocationIcon fontSize="small" />}
              label="Location"
              value={`${user.location.city}, ${user.location.country}`}
            />
          )}
          {formattedDOB && (
            <InfoItem
              icon={<Cake fontSize="small" />}
              label="Birthday"
              value={`${formattedDOB}${age ? ` (${age} years old)` : ''}`}
            />
          )}
          {user.gender && <InfoItem icon={<Wc fontSize="small" />} label="Gender" value={user.gender} />}
          {user.primaryTimezone && (
            <InfoItem icon={<Public fontSize="small" />} label="Timezone" value={user.primaryTimezone} />
          )}
        </Stack>

        {/* Privacy Settings - only show to profile owner */}
        {isOwnProfile &&
          (user.socialVisibility ||
            user.shareRSVPByDefault !== undefined ||
            user.shareCheckinsByDefault !== undefined) && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Privacy Settings
              </Typography>
              <Stack spacing={1}>
                {user.socialVisibility && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Visibility fontSize="small" color="action" />
                    <Typography variant="body2">Profile: {user.socialVisibility}</Typography>
                  </Stack>
                )}
                {user.shareRSVPByDefault && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Share fontSize="small" color="action" />
                    <Typography variant="body2">Shares RSVPs by default</Typography>
                  </Stack>
                )}
                {user.shareCheckinsByDefault && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CheckCircle fontSize="small" color="action" />
                    <Typography variant="body2">Shares check-ins by default</Typography>
                  </Stack>
                )}
              </Stack>
            </Box>
          )}

        {/* Interests */}
        {user.interests && user.interests.length > 0 && (
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Interests
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
              {user.interests.map((category, index) => (
                <EventCategoryBadge key={`${category.eventCategoryId || index}`} category={category} />
              ))}
            </Stack>
          </Box>
        )}

        {/* Edit Button for Own Profile */}
        {isOwnProfile && (
          <Box sx={{ mt: 3 }}>
            <Button component={Link} href={ROUTES.ACCOUNT.ROOT} variant="outlined" fullWidth>
              Edit Profile
            </Button>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
