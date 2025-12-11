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
} from '@mui/material';
import {
  Edit as EditIcon,
  CameraAlt as CameraIcon
} from '@mui/icons-material';
import { Address, UpdateUserInput, User } from '@/data/graphql/types/graphql';
import { useActionState } from 'react';
import { updateUserProfileAction } from '@/data/actions/server/user/update-user-profile';
import { useCustomAppContext } from '@/components/app-context';
import { SERVER_ACTION_INITIAL_STATE } from '@/lib/constants';
import { FormErrors } from '@/components/form-errors';
import AddressForm from '@/components/forms/input-address';

export default function EditProfilePage({ user }: { user: User }) {
  const [isEditing, setIsEditing] = useState(false);
  const { setToastProps, toastProps } = useCustomAppContext();
  const [formState, formAction] = useActionState(updateUserProfileAction, SERVER_ACTION_INITIAL_STATE);
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
      [name]: value
    }));
  };

  const handleAddressChange = (address: Address) => {
    setProfile(prev => ({
      ...prev,
      address: address,
    }))
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, margin: 'auto' }}>
      <Box
        sx={{
          display: { xs: 'block', md: 'flex' },
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3
        }}
      >
        <Typography variant="h4" fontWeight='bold' sx={{ mb: { xs: 2, md: 0 } }}>
          Edit Profile
        </Typography>

        {!isEditing && (
          <Button
            startIcon={<EditIcon />}
            onClick={() => setIsEditing(true)}
            variant="outlined"
            color="primary"
          >
            Edit
          </Button>
        )}
      </Box>

      <Box component="form" action={formAction} noValidate>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={profile.profile_picture || ''}
              alt={`${profile.given_name} ${profile.family_name}`}
              sx={{ width: 120, height: 120, mb: 2 }}
            />
            {isEditing && (
              <Box sx={{ position: 'absolute', bottom: 10, right: 0 }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="profile-picture-upload"
                  type="file"
                />
                <label htmlFor="profile-picture-upload">
                  <IconButton
                    component="span"
                    sx={{
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' }
                    }}
                  >
                    <CameraIcon fontSize="small" />
                  </IconButton>
                </label>
              </Box>
            )}
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Contact Information
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="given_name"
                  value={profile.given_name || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  variant="outlined"
                  color='secondary'
                />
                <FormErrors error={formState?.zodErrors?.given_name} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Surname"
                  name="family_name"
                  value={profile.family_name || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  variant="outlined"
                  color='secondary'
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
                  color='secondary'
                />
                <FormErrors error={formState?.zodErrors?.username} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Birthdate"
                  name="birthdate"
                  type="date"
                  value={profile.birthdate || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  variant="outlined"
                  color='secondary'
                  slotProps={{
                    inputLabel: {
                      shrink: true
                    }
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
                  rows={3}
                  variant="outlined"
                  color='secondary'
                />
                <FormErrors error={formState?.zodErrors?.bio} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    name="phone_number"
                    value={profile.phone_number || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    variant="outlined"
                    color='secondary'
                  />
                  <FormErrors error={formState?.zodErrors?.phone_number} />
                </Box>
              </Grid>
            </Grid>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="h5" sx={{ my: 2 }}>
              Home Address
            </Typography>
            <AddressForm
              value={profile.address}
              onChange={handleAddressChange}
              disabled={!isEditing}
              name='address'
            />
          </Grid>
        </Grid>

        {isEditing && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              sx={{ mr: 2 }}
              color="secondary"
              onClick={() => setIsEditing(false)}
              disabled={loading}
              type="button"
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        )}
      </Box>
    </Box >
  );
};
