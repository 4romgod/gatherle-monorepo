'use client';

import React, { useActionState, useEffect, useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Block as BlockIcon, Save as SaveIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import { signIn, useSession } from 'next-auth/react';
import { updateUserProfileAction } from '@/data/actions/server/user/update-user-profile';
import { FollowPolicy, Gender, SocialVisibility, type User } from '@/data/graphql/types/graphql';
import { useAppContext } from '@/hooks/useAppContext';
import { featureFlags } from '@/lib/constants/feature-flags';
import { BlockedUsersList } from '@/components/users/BlockedUsersList';
import { SETTINGS_PRIMARY_BUTTON_SX, SETTINGS_SECONDARY_BUTTON_SX, SettingsSection } from './SettingsSection';

type PersonalSettingsSection = 'activity' | 'personal' | 'privacy';

interface PersonalSettings {
  birthdate: string;
  defaultVisibility: SocialVisibility;
  followersListVisibility: SocialVisibility;
  followPolicy: FollowPolicy;
  followingListVisibility: SocialVisibility;
  gender: Gender | null;
  phone_number: string;
  shareCheckinsByDefault: boolean;
  shareRSVPByDefault: boolean;
}

type PrivacySettingsSource = Partial<
  Pick<User, 'defaultVisibility' | 'followPolicy' | 'followersListVisibility' | 'followingListVisibility'>
>;

function getPrivacySettings(
  user: PrivacySettingsSource,
): Pick<
  PersonalSettings,
  'defaultVisibility' | 'followPolicy' | 'followersListVisibility' | 'followingListVisibility'
> {
  if (!featureFlags.enablePrivateUsers) {
    return {
      defaultVisibility: SocialVisibility.Public,
      followPolicy: FollowPolicy.Public,
      followersListVisibility: SocialVisibility.Public,
      followingListVisibility: SocialVisibility.Public,
    };
  }

  return {
    defaultVisibility: user.defaultVisibility || SocialVisibility.Public,
    followPolicy: user.followPolicy || FollowPolicy.Public,
    followersListVisibility: user.followersListVisibility || SocialVisibility.Public,
    followingListVisibility: user.followingListVisibility || SocialVisibility.Public,
  };
}

const SECTION_COPY: Record<PersonalSettingsSection, { description: string; title: string }> = {
  activity: {
    description: 'Decide which activity defaults should apply to your account.',
    title: 'Activity',
  },
  personal: {
    description: 'Personal information and discovery-relevant details.',
    title: 'Personal',
  },
  privacy: {
    description: 'Decide how visible your activity and social graph should be.',
    title: 'Privacy',
  },
};

export default function PersonalSettingsPage({
  user,
  section = 'personal',
}: {
  user: User;
  section?: PersonalSettingsSection;
}) {
  const { setToastProps, toastProps } = useAppContext();
  const [formState, formAction] = useActionState(updateUserProfileAction, {});
  const [blockedUsersOpen, setBlockedUsersOpen] = useState(false);
  const { data: session } = useSession();
  const [settings, setSettings] = useState<PersonalSettings>({
    birthdate: user.birthdate || '',
    gender: user.gender || null,
    phone_number: user.phone_number || '',
    ...getPrivacySettings(user),
    shareRSVPByDefault: user.shareRSVPByDefault ?? true,
    shareCheckinsByDefault: user.shareCheckinsByDefault ?? true,
  });

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    setSettings({
      birthdate: session.user.birthdate || '',
      gender: session.user.gender || null,
      phone_number: session.user.phone_number || '',
      ...getPrivacySettings(session.user),
      shareRSVPByDefault: session.user.shareRSVPByDefault ?? true,
      shareCheckinsByDefault: session.user.shareCheckinsByDefault ?? true,
    });
  }, [session?.user]);

  useEffect(() => {
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

      setSettings({
        birthdate: updatedUser.birthdate || '',
        gender: updatedUser.gender || null,
        phone_number: updatedUser.phone_number || '',
        ...getPrivacySettings(updatedUser),
        shareRSVPByDefault: updatedUser.shareRSVPByDefault ?? true,
        shareCheckinsByDefault: updatedUser.shareCheckinsByDefault ?? true,
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
        message: 'Settings updated successfully!',
      });
    }
  }, [formState, session, setToastProps, toastProps]);

  const handleBooleanToggle = (name: 'shareRSVPByDefault' | 'shareCheckinsByDefault') => {
    setSettings((previous) => ({
      ...previous,
      [name]: !previous[name],
    }));
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setSettings((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  return (
    <>
      <Box component="form" action={formAction} noValidate>
        <input type="hidden" name="birthdate" value={settings.birthdate} />
        <input type="hidden" name="gender" value={settings.gender || ''} />
        <input
          type="hidden"
          name="followPolicy"
          value={featureFlags.enablePrivateUsers ? settings.followPolicy : FollowPolicy.Public}
        />
        <input
          type="hidden"
          name="followersListVisibility"
          value={featureFlags.enablePrivateUsers ? settings.followersListVisibility : SocialVisibility.Public}
        />
        <input
          type="hidden"
          name="followingListVisibility"
          value={featureFlags.enablePrivateUsers ? settings.followingListVisibility : SocialVisibility.Public}
        />
        <input
          type="hidden"
          name="defaultVisibility"
          value={featureFlags.enablePrivateUsers ? settings.defaultVisibility : SocialVisibility.Public}
        />
        <input type="hidden" name="shareRSVPByDefault" value={String(settings.shareRSVPByDefault)} />
        <input type="hidden" name="shareCheckinsByDefault" value={String(settings.shareCheckinsByDefault)} />
        <input type="hidden" name="phone_number" value={settings.phone_number} />

        <Stack spacing={4}>
          {section === 'personal' ? (
            <SettingsSection description={SECTION_COPY.personal.description} title={SECTION_COPY.personal.title}>
              <Grid container spacing={{ xs: 2, sm: 3 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <LocalizationProvider adapterLocale="en" dateAdapter={AdapterDayjs}>
                      <DatePicker
                        format="YYYY-MM-DD"
                        label="Date of birth"
                        name="birthdate"
                        onChange={(newValue) => {
                          setSettings((previous) => ({
                            ...previous,
                            birthdate: newValue ? newValue.format('YYYY-MM-DD') : '',
                          }));
                        }}
                        slotProps={{
                          textField: {
                            color: 'secondary',
                            id: 'personal-birthdate',
                          },
                        }}
                        value={settings.birthdate ? dayjs(settings.birthdate) : null}
                      />
                    </LocalizationProvider>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel color="secondary" id="personal-gender-label">
                      Gender
                    </InputLabel>
                    <Select
                      color="secondary"
                      id="personal-gender"
                      label="Gender"
                      labelId="personal-gender-label"
                      name="gender"
                      onChange={(event) => handleInputChange(event as React.ChangeEvent<HTMLInputElement>)}
                      value={settings.gender || ''}
                    >
                      {Object.values(Gender).map((gender) => (
                        <MenuItem key={gender} value={gender}>
                          {gender}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    color="secondary"
                    fullWidth
                    id="personal-phone-number"
                    label="Phone number"
                    name="phone_number"
                    onChange={(event) => setSettings((previous) => ({ ...previous, phone_number: event.target.value }))}
                    placeholder="+27 12 345 6789"
                    value={settings.phone_number}
                  />
                </Grid>
              </Grid>
            </SettingsSection>
          ) : null}

          {section === 'privacy' && featureFlags.enablePrivateUsers ? (
            <>
              <SettingsSection description={SECTION_COPY.privacy.description} title={SECTION_COPY.privacy.title}>
                <Stack spacing={2}>
                  <Box sx={{ py: 0.5 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.followPolicy === FollowPolicy.RequireApproval}
                          color="secondary"
                          name="followPolicy"
                          onChange={() =>
                            setSettings((previous) => ({
                              ...previous,
                              followPolicy:
                                previous.followPolicy === FollowPolicy.Public
                                  ? FollowPolicy.RequireApproval
                                  : FollowPolicy.Public,
                            }))
                          }
                        />
                      }
                      label={
                        <Box>
                          <Typography fontWeight={600} variant="body1">
                            Private account
                          </Typography>
                          <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">
                            Require your approval before someone can follow you.
                          </Typography>
                        </Box>
                      }
                    />
                  </Box>

                  <FormControl fullWidth variant="outlined">
                    <InputLabel color="secondary" id="default-visibility-label">
                      Default activity visibility
                    </InputLabel>
                    <Select
                      color="secondary"
                      id="default-visibility"
                      label="Default activity visibility"
                      labelId="default-visibility-label"
                      onChange={(event) =>
                        setSettings((previous) => ({
                          ...previous,
                          defaultVisibility: event.target.value as SocialVisibility,
                        }))
                      }
                      value={settings.defaultVisibility}
                    >
                      <MenuItem value={SocialVisibility.Public}>Everyone</MenuItem>
                      <MenuItem value={SocialVisibility.Followers}>Followers only</MenuItem>
                      <MenuItem value={SocialVisibility.Private}>Only me</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth variant="outlined">
                    <InputLabel color="secondary" id="followers-visibility-label">
                      Followers list visibility
                    </InputLabel>
                    <Select
                      color="secondary"
                      id="followers-visibility"
                      label="Followers list visibility"
                      labelId="followers-visibility-label"
                      onChange={(event) =>
                        setSettings((previous) => ({
                          ...previous,
                          followersListVisibility: event.target.value as SocialVisibility,
                        }))
                      }
                      value={settings.followersListVisibility}
                    >
                      <MenuItem value={SocialVisibility.Public}>Everyone</MenuItem>
                      <MenuItem value={SocialVisibility.Followers}>Followers only</MenuItem>
                      <MenuItem value={SocialVisibility.Private}>Only me</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth variant="outlined">
                    <InputLabel color="secondary" id="following-visibility-label">
                      Following list visibility
                    </InputLabel>
                    <Select
                      color="secondary"
                      id="following-visibility"
                      label="Following list visibility"
                      labelId="following-visibility-label"
                      onChange={(event) =>
                        setSettings((previous) => ({
                          ...previous,
                          followingListVisibility: event.target.value as SocialVisibility,
                        }))
                      }
                      value={settings.followingListVisibility}
                    >
                      <MenuItem value={SocialVisibility.Public}>Everyone</MenuItem>
                      <MenuItem value={SocialVisibility.Followers}>Followers only</MenuItem>
                      <MenuItem value={SocialVisibility.Private}>Only me</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </SettingsSection>

              <SettingsSection
                description="Manage users you’ve blocked. Blocked users cannot follow you or see your activity."
                title="Blocked users"
              >
                <Button
                  color="secondary"
                  onClick={() => setBlockedUsersOpen(true)}
                  startIcon={<BlockIcon />}
                  sx={{ ...SETTINGS_SECONDARY_BUTTON_SX, alignSelf: 'flex-start', width: { xs: '100%', sm: 'auto' } }}
                  variant="outlined"
                >
                  View blocked users
                </Button>
              </SettingsSection>
            </>
          ) : null}

          {section === 'activity' ? (
            <SettingsSection description={SECTION_COPY.activity.description} title={SECTION_COPY.activity.title}>
              <Stack spacing={2}>
                <Box sx={{ py: 0.5 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.shareRSVPByDefault}
                        color="secondary"
                        onChange={() => handleBooleanToggle('shareRSVPByDefault')}
                      />
                    }
                    label={
                      <Box>
                        <Typography fontWeight={600} variant="body1">
                          Share RSVPs by default
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">
                          Let your followers see when you RSVP to events.
                        </Typography>
                      </Box>
                    }
                  />
                </Box>

                <Box sx={{ py: 0.5 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.shareCheckinsByDefault}
                        color="secondary"
                        onChange={() => handleBooleanToggle('shareCheckinsByDefault')}
                      />
                    }
                    label={
                      <Box>
                        <Typography fontWeight={600} variant="body1">
                          Share check-ins by default
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">
                          Let your followers see when you check in at events.
                        </Typography>
                      </Box>
                    }
                  />
                </Box>
              </Stack>
            </SettingsSection>
          ) : null}

          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end">
            <Button
              color="primary"
              size="large"
              startIcon={<SaveIcon />}
              sx={{ ...SETTINGS_PRIMARY_BUTTON_SX, width: { xs: '100%', sm: 'auto' } }}
              type="submit"
              variant="contained"
            >
              Save changes
            </Button>
          </Stack>
        </Stack>
      </Box>

      <BlockedUsersList onClose={() => setBlockedUsersOpen(false)} open={blockedUsersOpen} />
    </>
  );
}
