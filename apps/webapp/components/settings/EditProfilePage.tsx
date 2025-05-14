'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  Grid,
  Paper,
  IconButton
} from '@mui/material';
import {
  Edit as EditIcon,
  CameraAlt as CameraIcon
} from '@mui/icons-material';
import { CreateUserInputType, UserType } from '@/data/graphql/types/graphql';

export default function EditProfilePage({ user }: { user: UserType }) {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<CreateUserInputType>({
    given_name: user.given_name,
    family_name: user.family_name,
    email: user.email,
    address: user.address,
    profile_picture: user.profile_picture,
    birthdate: user.birthdate,
    password: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfile(prev => ({
          ...prev,
          profilePicture: event.target?.result as string
        }));
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSave = () => {
    // TODO: Implement actual save logic (API call, etc.)
    setIsEditing(false);
    console.log('Profile saved:', profile);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, margin: 'auto' }}>
      <Paper elevation={3} sx={{ padding: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight='bold' sx={{ mb: 5 }}>
            Edit Profile
          </Typography>

          {!isEditing && (
            <Button
              startIcon={<EditIcon />}
              onClick={() => setIsEditing(true)}
              variant="outlined"
              color="secondary"
            >
              Edit
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={profile.profile_picture || ''}
              sx={{ width: 120, height: 120, mb: 2 }}
            />
            {isEditing && (
              <Box sx={{ position: 'absolute', bottom: 10, right: 0 }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="profile-picture-upload"
                  type="file"
                  onChange={handleProfilePictureChange}
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

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="First Name"
              name="given_name"
              value={profile.given_name}
              onChange={handleInputChange}
              disabled={!isEditing}
              variant="outlined"
              color='secondary'
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Surname"
              name="family_name"
              value={profile.family_name}
              onChange={handleInputChange}
              disabled={!isEditing}
              variant="outlined"
              color='secondary'
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              value={profile.email}
              onChange={handleInputChange}
              disabled={!isEditing}
              variant="outlined"
              color='secondary'
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            {/* TODO Enable this field when the backend is ready */}
            <TextField
              fullWidth
              label="Bio"
              // name="bio"
              // value={profile.bio}
              // onChange={handleInputChange}
              disabled={!isEditing}
              multiline
              rows={3}
              variant="outlined"
              color='secondary'
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Location"
              name="address"
              value={profile.address}
              onChange={handleInputChange}
              disabled={!isEditing}
              variant="outlined"
              color='secondary'
            />
          </Grid>
        </Grid>

        {isEditing && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              sx={{ mr: 2 }}
              color="secondary"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
            >
              Save Changes
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};
