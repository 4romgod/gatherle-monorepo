'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { useActionState } from 'react';
import { Avatar, Box, Button, CircularProgress, Grid, IconButton, Stack, TextField, Typography } from '@mui/material';
import { CameraAlt as CameraIcon, Save as SaveIcon } from '@mui/icons-material';
import { signIn, useSession } from 'next-auth/react';
import { FormErrors } from '@/components/FormErrors';
import LocationInput from '@/components/forms/LocationInput';
import { updateUserProfileAction } from '@/data/actions/server/user/update-user-profile';
import {
  MediaEntityType,
  MediaType,
  type UpdateUserInput,
  type User,
  type UserLocationInput,
} from '@/data/graphql/types/graphql';
import { useAppContext } from '@/hooks/useAppContext';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { SETTINGS_PRIMARY_BUTTON_SX, SettingsSection } from './SettingsSection';

export default function EditProfilePage({ user }: { user: User }) {
  const { setToastProps, toastProps } = useAppContext();
  const [formState, formAction] = useActionState(updateUserProfileAction, {});
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const {
    upload: uploadAvatar,
    uploading: avatarUploading,
    error: avatarError,
  } = useMediaUpload({
    entityType: MediaEntityType.User,
    mediaType: MediaType.Avatar,
  });

  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [localAvatarPreview, setLocalAvatarPreview] = useState<string | null>(null);
  const [profile, setProfile] = useState<UpdateUserInput>({
    userId: user.userId,
    given_name: user.given_name,
    family_name: user.family_name,
    profile_picture: user.profile_picture,
    bio: user.bio,
    username: user.username,
    location: user.location,
  });

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    setProfile({
      userId: session.user.userId,
      given_name: session.user.given_name,
      family_name: session.user.family_name,
      profile_picture: session.user.profile_picture,
      bio: session.user.bio,
      username: session.user.username,
      location: session.user.location,
    });
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

      setProfile({
        userId: updatedUser.userId,
        given_name: updatedUser.given_name,
        family_name: updatedUser.family_name,
        profile_picture: updatedUser.profile_picture,
        bio: updatedUser.bio,
        username: updatedUser.username,
        location: updatedUser.location,
      });

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
      setPendingAvatarFile(null);
      setLocalAvatarPreview(null);
    }
  }, [formState, session, setToastProps, toastProps]);

  const handleAvatarSelect = (file: File) => {
    setPendingAvatarFile(file);
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
      } catch {
        setLoading(false);
        return;
      }
    }

    startTransition(() => {
      if (!formRef.current) {
        return;
      }

      const data = new FormData(formRef.current);
      data.set('profile_picture', finalProfile.profile_picture || '');
      formAction(data);
    });
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleLocationChange = (location: UserLocationInput) => {
    setProfile((previous) => ({
      ...previous,
      location,
    }));
  };

  return (
    <Box component="form" ref={formRef} action={formAction} noValidate>
      <input type="hidden" name="given_name" value={profile.given_name || ''} />
      <input type="hidden" name="family_name" value={profile.family_name || ''} />
      <input type="hidden" name="username" value={profile.username || ''} />
      <input type="hidden" name="bio" value={profile.bio || ''} />
      <input type="hidden" name="location" value={JSON.stringify(profile.location || {})} />
      <input type="hidden" name="profile_picture" value={profile.profile_picture || ''} />

      <Stack spacing={4}>
        <SettingsSection
          description="These details follow you into event cards, messages, and your profile header."
          title="Public identity"
        >
          <Stack spacing={3}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2.5}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
            >
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  alt={`${profile.given_name ?? ''} ${profile.family_name ?? ''}`.trim()}
                  src={localAvatarPreview || profile.profile_picture || ''}
                  sx={(theme) => ({
                    width: 92,
                    height: 92,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  })}
                />
                {avatarUploading ? (
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
                ) : null}
                <Box sx={{ position: 'absolute', bottom: 0, right: 0 }}>
                  <input
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    id="profile-picture-upload"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        handleAvatarSelect(file);
                      }
                      event.target.value = '';
                    }}
                    style={{ display: 'none' }}
                    type="file"
                  />
                  <label htmlFor="profile-picture-upload">
                    <IconButton
                      component="span"
                      disabled={avatarUploading}
                      sx={{
                        bgcolor: 'secondary.main',
                        color: 'secondary.contrastText',
                        height: 40,
                        width: 40,
                        '&:hover': {
                          bgcolor: 'secondary.dark',
                        },
                      }}
                    >
                      <CameraIcon />
                    </IconButton>
                  </label>
                </Box>
              </Box>

              <Stack spacing={0.5}>
                <Typography fontWeight={700} variant="body1">
                  Profile picture
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  Upload a clear square image so people recognize you quickly across Gatherle.
                </Typography>
                {avatarError ? (
                  <Typography color="error" variant="caption">
                    {avatarError}
                  </Typography>
                ) : null}
              </Stack>
            </Stack>

            <Grid container spacing={{ xs: 2, sm: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  color="secondary"
                  fullWidth
                  id="profile-given-name"
                  label="First name"
                  name="given_name"
                  onChange={handleInputChange}
                  value={profile.given_name || ''}
                />
                <FormErrors error={formState?.zodErrors?.given_name} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  color="secondary"
                  fullWidth
                  id="profile-family-name"
                  label="Last name"
                  name="family_name"
                  onChange={handleInputChange}
                  value={profile.family_name || ''}
                />
                <FormErrors error={formState?.zodErrors?.family_name} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  color="secondary"
                  fullWidth
                  id="profile-username"
                  label="Username"
                  name="username"
                  onChange={handleInputChange}
                  value={profile.username || ''}
                />
                <FormErrors error={formState?.zodErrors?.username} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  color="secondary"
                  fullWidth
                  id="profile-bio"
                  label="Bio"
                  multiline
                  name="bio"
                  onChange={handleInputChange}
                  placeholder="Tell people what you’re into."
                  rows={4}
                  value={profile.bio || ''}
                />
                <FormErrors error={formState?.zodErrors?.bio} />
              </Grid>
            </Grid>
          </Stack>
        </SettingsSection>

        <SettingsSection description="A light location signal helps Gatherle keep discovery relevant." title="Location">
          <LocationInput disabled={false} name="location" onChange={handleLocationChange} value={profile.location} />
        </SettingsSection>

        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end">
          <Button
            color="primary"
            disabled={loading || avatarUploading || isPending}
            onClick={handleSave}
            size="large"
            startIcon={loading || avatarUploading ? <CircularProgress color="inherit" size={20} /> : <SaveIcon />}
            sx={{ ...SETTINGS_PRIMARY_BUTTON_SX, width: { xs: '100%', sm: 'auto' } }}
            type="button"
            variant="contained"
          >
            {loading || avatarUploading ? 'Saving...' : 'Save profile'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
