'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  Grid,
  IconButton,
  CircularProgress,
  Stack,
  Card,
} from '@mui/material';
import { Edit as EditIcon, CameraAlt as CameraIcon, Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { Address, UpdateUserInput, User } from '@/data/graphql/types/graphql';
import { useActionState } from 'react';
import { updateUserProfileAction } from '@/data/actions/server/user/update-user-profile';
import { useAppContext } from '@/hooks/useAppContext';
import { FormErrors } from '@/components/form-errors';
import AddressForm from '@/components/forms/input-address';
import { BUTTON_STYLES, SECTION_TITLE_STYLES } from '@/lib/constants';

export default function EditProfilePage({ user }: { user: User }) {
  const [isEditing, setIsEditing] = useState(false);
  const { setToastProps, toastProps } = useAppContext();
  const [formState, formAction] = useActionState(updateUserProfileAction, {});
  const [loading, setLoading] = useState(false);

  const [profile, setProfile] = useState<UpdateUserInput>({
    userId: user.userId,
    given_name: user.given_name,
    family_name: user.family_name,
    profile_picture: user.profile_picture,
    bio: user.bio,
    phone_number: user.phone_number,
    birthdate: user.birthdate,
    username: user.username,
    address: user.address,
  });

  useEffect(() => {
    setLoading(false);

    if (formState.apiError) {
      setToastProps({
        ...toastProps,
        open: true,
        severity: 'error',
        message: formState.apiError,
      });
    }

    if (formState.data) {
      setToastProps({
        ...toastProps,
        open: true,
        severity: 'success',
        message: 'Profile updated successfully!',
      });
      setIsEditing(false);
    }
  }, [formState]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddressChange = (address: Address) => {
    setProfile(prev => ({
      ...prev,
      address: address,
    }));
  };

  return (
    <Box>
      {/* Page Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={{ xs: 2, sm: 0 }}
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography
            variant="overline"
            sx={{
              color: 'primary.main',
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
            }}
          >
            PROFILE
          </Typography>
          <Typography variant="h4" sx={{ ...SECTION_TITLE_STYLES, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            Edit Profile
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
            Update your profile information and how others see you
          </Typography>
        </Box>

        {!isEditing && (
          <Button
            startIcon={<EditIcon />}
            onClick={() => setIsEditing(true)}
            variant="contained"
            color="primary"
            size="large"
            sx={{ ...BUTTON_STYLES, px: { xs: 2, sm: 3 }, width: { xs: '100%', sm: 'auto' } }}
          >
            Edit Profile
          </Button>
        )}
      </Stack>

      <Box component="form" action={formAction} noValidate>
        {/* Profile Picture Section */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            p: 3,
            mb: 3,
          }}
        >
          <Typography variant="h6" sx={{ ...SECTION_TITLE_STYLES, fontSize: '1.125rem', mb: 3 }}>
            Profile Picture
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={profile.profile_picture || ''}
                alt={`${profile.given_name} ${profile.family_name}`}
                sx={theme => ({
                  width: { xs: 80, sm: 100 },
                  height: { xs: 80, sm: 100 },
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                })}
              />
              {isEditing && (
                <Box sx={{ position: 'absolute', bottom: 0, right: 0 }}>
                  <input accept="image/*" style={{ display: 'none' }} id="profile-picture-upload" type="file" />
                  <label htmlFor="profile-picture-upload">
                    <IconButton
                      component="span"
                      sx={{
                        bgcolor: 'secondary.main',
                        color: 'secondary.contrastText',
                        width: 40,
                        height: 40,
                        '&:hover': {
                          bgcolor: 'secondary.dark',
                        },
                      }}
                    >
                      <CameraIcon />
                    </IconButton>
                  </label>
                </Box>
              )}
            </Box>
          </Stack>
        </Card>

        {/* Contact Information */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            p: 3,
            mb: 3,
          }}
        >
          <Typography variant="h6" sx={{ ...SECTION_TITLE_STYLES, fontSize: '1.125rem', mb: 3 }}>
            Contact Information
          </Typography>

          <Grid container spacing={{ xs: 2, sm: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="First Name"
                name="given_name"
                value={profile.given_name || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                variant="outlined"
                color="secondary"
              />
              <FormErrors error={formState?.zodErrors?.given_name} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Last Name"
                name="family_name"
                value={profile.family_name || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                variant="outlined"
                color="secondary"
              />
              <FormErrors error={formState?.zodErrors?.family_name} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Username"
                name="username"
                value={profile.username || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                variant="outlined"
                color="secondary"
              />
              <FormErrors error={formState?.zodErrors?.username} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Phone Number"
                name="phone_number"
                value={profile.phone_number || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                variant="outlined"
                color="secondary"
              />
              <FormErrors error={formState?.zodErrors?.phone_number} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Date of Birth"
                name="birthdate"
                type="date"
                value={profile.birthdate || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                variant="outlined"
                color="secondary"
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
              />
              <FormErrors error={formState?.zodErrors?.birthdate} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Bio"
                name="bio"
                value={profile.bio || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                multiline
                rows={4}
                variant="outlined"
                color="secondary"
                placeholder="Tell others about yourself..."
              />
              <FormErrors error={formState?.zodErrors?.bio} />
            </Grid>
          </Grid>
        </Card>

        {/* Address Information */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            p: 3,
            mb: 3,
          }}
        >
          <Typography variant="h6" sx={{ ...SECTION_TITLE_STYLES, fontSize: '1.125rem', mb: 3 }}>
            Home Address
          </Typography>

          <AddressForm value={profile.address} onChange={handleAddressChange} disabled={!isEditing} name="address" />
        </Card>

        {/* Action Buttons */}
        {isEditing && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
            <Button
              startIcon={<CancelIcon />}
              onClick={() => setIsEditing(false)}
              disabled={loading}
              variant="outlined"
              size="large"
              sx={{ ...BUTTON_STYLES, px: { xs: 2, sm: 4 }, width: { xs: '100%', sm: 'auto' } }}
            >
              Cancel
            </Button>
            <Button
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              variant="contained"
              color="primary"
              type="submit"
              disabled={loading}
              size="large"
              sx={{ ...BUTTON_STYLES, px: { xs: 2, sm: 4 }, width: { xs: '100%', sm: 'auto' } }}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
