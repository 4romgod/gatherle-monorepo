'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
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
import { useActionState } from 'react';
import { updateUserProfileAction } from '@/data/actions/server/user/update-user-profile';
import { useAppContext } from '@/hooks/useAppContext';
import { FormErrors } from '@/components/FormErrors';
import LocationInput from '@/components/forms/LocationInput';
import { BUTTON_STYLES, SECTION_TITLE_STYLES } from '@/lib/constants';
import { signIn, useSession } from 'next-auth/react';
import { UpdateUserInput, User, UserLocationInput } from '@/data/graphql/types/graphql';
import { ImageEntityType, ImageType } from '@/data/graphql/types/graphql';
import { useImageUpload } from '@/hooks/useImageUpload';

export default function EditProfilePage({ user }: { user: User }) {
  const [isEditing, setIsEditing] = useState(false);
  const { setToastProps, toastProps } = useAppContext();
  const [formState, formAction] = useActionState(updateUserProfileAction, {});
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();

  const {
    upload: uploadAvatar,
    uploading: avatarUploading,
    error: avatarError,
  } = useImageUpload({
    entityType: ImageEntityType.User,
    imageType: ImageType.Avatar,
    // entityId omitted — resolver auto-uses the authenticated user's ID
  });

  // Pending file selected but not yet uploaded — upload happens on Save
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [localAvatarPreview, setLocalAvatarPreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const [profile, setProfile] = useState<UpdateUserInput>({
    userId: user.userId,
    given_name: user.given_name,
    family_name: user.family_name,
    profile_picture: user.profile_picture,
    bio: user.bio,
    username: user.username,
    location: user.location,
  });

  // Sync local state with session when it updates (e.g., after tab switch)
  useEffect(() => {
    if (session?.user) {
      setProfile({
        userId: session.user.userId,
        given_name: session.user.given_name,
        family_name: session.user.family_name,
        profile_picture: session.user.profile_picture,
        bio: session.user.bio,
        username: session.user.username,
        location: session.user.location,
      });
    }
  }, [session]);

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

    if (formState.data && session?.user?.token) {
      const updatedUser = formState.data as User;

      // Update local state immediately with the returned data
      setProfile({
        userId: updatedUser.userId,
        given_name: updatedUser.given_name,
        family_name: updatedUser.family_name,
        profile_picture: updatedUser.profile_picture,
        bio: updatedUser.bio,
        username: updatedUser.username,
        location: updatedUser.location,
      });

      // Refresh the session with updated user data
      signIn('refresh-session', {
        userData: JSON.stringify(updatedUser),
        token: session.user.token,
        redirect: false,
      });

      setToastProps({
        ...toastProps,
        open: true,
        severity: 'success',
        message: 'Profile updated successfully!',
      });
      setIsEditing(false);
    }
  }, [formState]);

  const handleAvatarSelect = (file: File) => {
    setPendingAvatarFile(file);
    // Show a local preview immediately — no upload yet
    const reader = new FileReader();
    reader.onloadend = () => setLocalAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setLoading(true);
    let finalProfile = profile;

    if (pendingAvatarFile) {
      try {
        const readUrl = await uploadAvatar(pendingAvatarFile);
        finalProfile = { ...profile, profile_picture: readUrl };
        setProfile(finalProfile);
        setPendingAvatarFile(null);
        setLocalAvatarPreview(null);
      } catch {
        // avatarError is set by the hook; abort the save so the user sees the error
        setLoading(false);
        return;
      }
    }

    // Trigger the server action via the hidden form, with up-to-date hidden inputs
    startTransition(() => {
      if (formRef.current) {
        const data = new FormData(formRef.current);
        // Ensure the potentially-updated profile_picture is used
        data.set('profile_picture', finalProfile.profile_picture || '');
        formAction(data);
      }
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLocationChange = (location: UserLocationInput) => {
    setProfile((prev) => ({
      ...prev,
      location: location,
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

      <Box component="form" ref={formRef} action={formAction} noValidate>
        {/* Hidden inputs to ensure form data is submitted */}
        <input type="hidden" name="given_name" value={profile.given_name || ''} />
        <input type="hidden" name="family_name" value={profile.family_name || ''} />
        <input type="hidden" name="username" value={profile.username || ''} />
        <input type="hidden" name="bio" value={profile.bio || ''} />
        <input type="hidden" name="location" value={JSON.stringify(profile.location || {})} />
        <input type="hidden" name="profile_picture" value={profile.profile_picture || ''} />

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
                src={localAvatarPreview || profile.profile_picture || ''}
                alt={`${profile.given_name} ${profile.family_name}`}
                sx={(theme) => ({
                  width: { xs: 80, sm: 100 },
                  height: { xs: 80, sm: 100 },
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                })}
              />
              {avatarUploading && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(0,0,0,0.45)',
                    borderRadius: '50%',
                  }}
                >
                  <CircularProgress size={24} sx={{ color: 'common.white' }} />
                </Box>
              )}
              {isEditing && (
                <Box sx={{ position: 'absolute', bottom: 0, right: 0 }}>
                  <input
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    style={{ display: 'none' }}
                    id="profile-picture-upload"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAvatarSelect(file);
                      e.target.value = '';
                    }}
                  />
                  <label htmlFor="profile-picture-upload">
                    <IconButton
                      component="span"
                      disabled={avatarUploading}
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
            {avatarError && (
              <Typography variant="caption" color="error">
                {avatarError}
              </Typography>
            )}
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
                id="profile-given-name"
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
                id="profile-family-name"
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
                id="profile-username"
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
                id="profile-bio"
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

        {/* Location Information */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            p: 3,
            mb: 3,
          }}
        >
          <Typography variant="h6" sx={{ ...SECTION_TITLE_STYLES, fontSize: '1.125rem', mb: 3 }}>
            Location
          </Typography>

          <LocationInput
            value={profile.location}
            onChange={handleLocationChange}
            disabled={!isEditing}
            name="location"
          />
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
              startIcon={loading || avatarUploading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              variant="contained"
              color="primary"
              type="button"
              onClick={handleSave}
              disabled={loading || avatarUploading || isPending}
              size="large"
              sx={{ ...BUTTON_STYLES, px: { xs: 2, sm: 4 }, width: { xs: '100%', sm: 'auto' } }}
            >
              {loading || avatarUploading ? 'Saving...' : 'Save Changes'}
            </Button>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
