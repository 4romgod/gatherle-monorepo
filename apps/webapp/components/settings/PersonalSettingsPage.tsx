'use client';

import React, { useActionState, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Card,
  TextField,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Save as SaveIcon, Block as BlockIcon } from '@mui/icons-material';
import { Gender, User, FollowPolicy, SocialVisibility } from '@/data/graphql/types/graphql';
import { updateUserProfileAction } from '@/data/actions/server/user/update-user-profile';
import { useAppContext } from '@/hooks/useAppContext';
import { BlockedUsersList } from '@/components/users/blocked-users-list';
import dayjs from 'dayjs';
import { BUTTON_STYLES, SECTION_TITLE_STYLES } from '@/lib/constants';
import { signIn, useSession } from 'next-auth/react';

interface PersonalSettings {
  birthdate: string;
  gender: Gender | null;
  phone_number: string;
  followPolicy: FollowPolicy;
  followersListVisibility: SocialVisibility;
  followingListVisibility: SocialVisibility;
  defaultVisibility: SocialVisibility;
  shareRSVPByDefault: boolean;
  shareCheckinsByDefault: boolean;
}

export default function PersonalSettingsPage({ user }: { user: User }) {
  const { setToastProps, toastProps } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [formState, formAction] = useActionState(updateUserProfileAction, {});
  const [blockedUsersOpen, setBlockedUsersOpen] = useState(false);
  const { data: session } = useSession();
  const [settings, setSettings] = useState<PersonalSettings>({
    birthdate: user.birthdate,
    gender: user.gender || null,
    phone_number: user.phone_number || '',
    followPolicy: user.followPolicy || FollowPolicy.Public,
    followersListVisibility: user.followersListVisibility || SocialVisibility.Public,
    followingListVisibility: user.followingListVisibility || SocialVisibility.Public,
    defaultVisibility: user.defaultVisibility || SocialVisibility.Public,
    shareRSVPByDefault: user.shareRSVPByDefault ?? true,
    shareCheckinsByDefault: user.shareCheckinsByDefault ?? true,
  });

  // Sync local state with session when it updates (e.g., after tab switch)
  useEffect(() => {
    if (session?.user) {
      setSettings({
        birthdate: session.user.birthdate,
        gender: session.user.gender || null,
        phone_number: session.user.phone_number || '',
        followPolicy: session.user.followPolicy || FollowPolicy.Public,
        followersListVisibility: session.user.followersListVisibility || SocialVisibility.Public,
        followingListVisibility: session.user.followingListVisibility || SocialVisibility.Public,
        defaultVisibility: session.user.defaultVisibility || SocialVisibility.Public,
        shareRSVPByDefault: session.user.shareRSVPByDefault ?? true,
        shareCheckinsByDefault: session.user.shareCheckinsByDefault ?? true,
      });
    }
  }, [session?.user]);

  const handleBooleanToggle = (name: 'shareRSVPByDefault' | 'shareCheckinsByDefault') => {
    setSettings(prev => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value,
    }));
  };

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
      setSettings({
        birthdate: updatedUser.birthdate,
        gender: updatedUser.gender || null,
        phone_number: updatedUser.phone_number || '',
        followPolicy: updatedUser.followPolicy || FollowPolicy.Public,
        followersListVisibility: updatedUser.followersListVisibility || SocialVisibility.Public,
        followingListVisibility: updatedUser.followingListVisibility || SocialVisibility.Public,
        defaultVisibility: updatedUser.defaultVisibility || SocialVisibility.Public,
        shareRSVPByDefault: updatedUser.shareRSVPByDefault ?? true,
        shareCheckinsByDefault: updatedUser.shareCheckinsByDefault ?? true,
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
        message: 'Personal Settings updated successfully!',
      });
    }
  }, [formState]);

  return (
    <Box>
      <Stack spacing={3}>
        {/* Page Header */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h4" sx={{ ...SECTION_TITLE_STYLES, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            Personal Settings
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
            Manage your personal information and privacy preferences
          </Typography>
        </Box>

        <Box component="form" action={formAction} noValidate>
          {/* Hidden fields to submit privacy values with form data */}
          <input type="hidden" name="birthdate" value={settings.birthdate} />
          <input type="hidden" name="gender" value={settings.gender || ''} />
          <input type="hidden" name="followPolicy" value={settings.followPolicy} />
          <input type="hidden" name="followersListVisibility" value={settings.followersListVisibility} />
          <input type="hidden" name="followingListVisibility" value={settings.followingListVisibility} />
          <input type="hidden" name="defaultVisibility" value={settings.defaultVisibility} />
          <input type="hidden" name="shareRSVPByDefault" value={String(settings.shareRSVPByDefault)} />
          <input type="hidden" name="shareCheckinsByDefault" value={String(settings.shareCheckinsByDefault)} />
          <input type="hidden" name="phone_number" value={settings.phone_number} />
          
          {/* Personal Details */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              p: 3,
              mb: 3,
            }}
          >
            <Typography variant="h6" sx={{ ...SECTION_TITLE_STYLES, fontSize: '1.125rem', mb: 3 }}>
              Personal Details
            </Typography>

            <Grid container spacing={{ xs: 2, sm: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en">
                    <DatePicker
                      label="Date of Birth"
                      format="YYYY-MM-DD"
                      name="birthdate"
                      value={dayjs(settings.birthdate)}
                      onChange={(newValue) => {
                        setSettings(prev => ({
                          ...prev,
                          birthdate: newValue ? newValue.format('YYYY-MM-DD') : prev.birthdate,
                        }));
                      }}
                      slotProps={{
                        textField: {
                          id: 'personal-birthdate',
                          color: 'secondary',
                        },
                      }}
                    />
                  </LocalizationProvider>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel id="personal-gender-label" color="secondary">Gender</InputLabel>
                  <Select
                    id="personal-gender"
                    labelId="personal-gender-label"
                    name="gender"
                    value={settings.gender || ''}
                    onChange={e => handleInputChange(e as React.ChangeEvent<HTMLInputElement>)}
                    label="Gender"
                    color="secondary"
                  >
                    {Object.values(Gender).map(gender => (
                      <MenuItem key={gender} value={gender}>
                        {gender}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  id="personal-phone-number"
                  fullWidth
                  label="Phone Number"
                  name="phone_number"
                  value={settings.phone_number}
                  onChange={e => setSettings(prev => ({ ...prev, phone_number: e.target.value }))}
                  variant="outlined"
                  color="secondary"
                  placeholder="+27 12 345 6789"
                />
              </Grid>
            </Grid>
          </Card>

          {/* Privacy Settings */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              p: 3,
              mb: 3,
            }}
          >
            <Typography variant="h6" sx={{ ...SECTION_TITLE_STYLES, fontSize: '1.125rem', mb: 3 }}>
              Privacy Settings
            </Typography>

            <Stack spacing={2}>
              <Box sx={{ py: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.followPolicy === FollowPolicy.RequireApproval}
                      onChange={() =>
                        setSettings(prev => ({
                          ...prev,
                          followPolicy:
                            prev.followPolicy === FollowPolicy.Public
                              ? FollowPolicy.RequireApproval
                              : FollowPolicy.Public,
                        }))
                      }
                      color="secondary"
                      name="followPolicy"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        Private Account
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Require your approval before someone can follow you
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              {/* Default Activity Visibility */}
              <Box sx={{ py: 1 }}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel id="default-visibility-label" color="secondary">Default Activity Visibility</InputLabel>
                  <Select
                    id="default-visibility"
                    labelId="default-visibility-label"
                    name="defaultVisibility"
                    value={settings.defaultVisibility}
                    onChange={e =>
                      setSettings(prev => ({
                        ...prev,
                        defaultVisibility: e.target.value as SocialVisibility,
                      }))
                    }
                    label="Default Activity Visibility"
                    color="secondary"
                  >
                    <MenuItem value={SocialVisibility.Public}>
                      <Box>
                        <Typography variant="body1">Everyone</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Your activity is visible to anyone
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value={SocialVisibility.Followers}>
                      <Box>
                        <Typography variant="body1">Followers Only</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Only people who follow you can see your activity
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value={SocialVisibility.Private}>
                      <Box>
                        <Typography variant="body1">Only Me</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Your activity is hidden from everyone
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Followers List Visibility */}
              <Box sx={{ py: 1 }}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel id="followers-visibility-label" color="secondary">Who can see your followers</InputLabel>
                  <Select
                    id="followers-visibility"
                    labelId="followers-visibility-label"
                    name="followersListVisibility"
                    value={settings.followersListVisibility}
                    onChange={e =>
                      setSettings(prev => ({
                        ...prev,
                        followersListVisibility: e.target.value as SocialVisibility,
                      }))
                    }
                    label="Who can see your followers"
                    color="secondary"
                  >
                    <MenuItem value={SocialVisibility.Public}>
                      <Box>
                        <Typography variant="body1">Everyone</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Anyone can see who follows you
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value={SocialVisibility.Followers}>
                      <Box>
                        <Typography variant="body1">Followers Only</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Only people who follow you can see your followers
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value={SocialVisibility.Private}>
                      <Box>
                        <Typography variant="body1">Only Me</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Only you can see who follows you
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Following List Visibility */}
              <Box sx={{ py: 1 }}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel id="following-visibility-label" color="secondary">Who can see who you follow</InputLabel>
                  <Select
                    id="following-visibility"
                    labelId="following-visibility-label"
                    name="followingListVisibility"
                    value={settings.followingListVisibility}
                    onChange={e =>
                      setSettings(prev => ({
                        ...prev,
                        followingListVisibility: e.target.value as SocialVisibility,
                      }))
                    }
                    label="Who can see who you follow"
                    color="secondary"
                  >
                    <MenuItem value={SocialVisibility.Public}>
                      <Box>
                        <Typography variant="body1">Everyone</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Anyone can see who you follow
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value={SocialVisibility.Followers}>
                      <Box>
                        <Typography variant="body1">Followers Only</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Only your followers can see who you follow
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value={SocialVisibility.Private}>
                      <Box>
                        <Typography variant="body1">Only Me</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Only you can see who you follow
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Stack>
          </Card>

          {/* Activity Sharing */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              p: 3,
              mb: 3,
            }}
          >
            <Typography variant="h6" sx={{ ...SECTION_TITLE_STYLES, fontSize: '1.125rem', mb: 3 }}>
              Activity Sharing
            </Typography>

            <Stack spacing={2}>
              <Box sx={{ py: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.shareRSVPByDefault}
                      onChange={() => handleBooleanToggle('shareRSVPByDefault')}
                      color="secondary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        Share RSVP Status
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Let your followers see when you RSVP to events
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              <Box sx={{ py: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.shareCheckinsByDefault}
                      onChange={() => handleBooleanToggle('shareCheckinsByDefault')}
                      color="secondary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        Share Check-ins
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Let your followers see when you check in at events
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </Stack>
          </Card>

          {/* Blocked Users Card */}
          <Card sx={{ p: 3, mb: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6" sx={SECTION_TITLE_STYLES}>
                Blocked Users
              </Typography>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Manage users you&apos;ve blocked. Blocked users cannot follow you or see your activity.
                </Typography>
                <Button
                  startIcon={<BlockIcon />}
                  variant="outlined"
                  color="secondary"
                  onClick={() => setBlockedUsersOpen(true)}
                  sx={{ ...BUTTON_STYLES }}
                >
                  View Blocked Users
                </Button>
              </Box>
            </Stack>
          </Card>

          {/* Action Button */}
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" sx={{ mt: 3 }}>
            <Button
              startIcon={<SaveIcon />}
              variant="contained"
              color="primary"
              type="submit"
              size="large"
              sx={{ ...BUTTON_STYLES, px: 4, width: { xs: '100%', sm: 'auto' } }}
            >
              Save Changes
            </Button>
          </Stack>
        </Box>
      </Stack>

      {/* Blocked Users Dialog */}
      <BlockedUsersList open={blockedUsersOpen} onClose={() => setBlockedUsersOpen(false)} />
    </Box>
  );
}
