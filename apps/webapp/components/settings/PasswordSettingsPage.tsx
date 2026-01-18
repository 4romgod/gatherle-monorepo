'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  Card,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { updateUserPasswordAction } from '@/data/actions/server/user/update-user-password';
import { useAppContext } from '@/hooks/useAppContext';
import { BUTTON_STYLES, SECTION_TITLE_STYLES } from '@/lib/constants';

interface PasswordSettings {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
  color: 'error' | 'warning' | 'info' | 'success';
}

import type { ActionState } from '@/data/actions/types';

export default function PasswordSettingsPage() {
  const { setToastProps, toastProps } = useAppContext();
  const [settings, setSettings] = useState<PasswordSettings>({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [actionState, setActionState] = useState<ActionState>({});

  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: [],
    color: 'error',
  });

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    if (!password) {
      return { score: 0, feedback: [], color: 'error' };
    }

    let score = 0;
    const feedback: string[] = [];

    if (password.length >= 8) score += 25;
    else feedback.push('Use at least 8 characters');

    if (password.length >= 12) score += 10;

    if (/[a-z]/.test(password)) score += 15;
    else feedback.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 15;
    else feedback.push('Include uppercase letters');

    if (/\d/.test(password)) score += 15;
    else feedback.push('Include numbers');

    if (/[^a-zA-Z0-9]/.test(password)) score += 20;
    else feedback.push('Include special characters');

    const commonPatterns = [/123/i, /abc/i, /password/i, /qwerty/i, /admin/i, /(\w)\1{2,}/i];

    const hasCommonPattern = commonPatterns.some(pattern => pattern.test(password));
    if (!hasCommonPattern) score += 10;
    else feedback.push('Avoid common patterns');

    let color: 'error' | 'warning' | 'info' | 'success' = 'error';
    if (score >= 80) color = 'success';
    else if (score >= 60) color = 'info';
    else if (score >= 40) color = 'warning';

    return { score: Math.min(100, score), feedback, color };
  };

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(settings.newPassword));
  }, [settings.newPassword]);

  useEffect(() => {
    if (actionState.success) {
      setToastProps({
        ...toastProps,
        open: true,
        severity: 'success',
        message: 'Password changed successfully!',
      });
      setSettings({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
    } else if (actionState.apiError) {
      setToastProps({
        ...toastProps,
        open: true,
        severity: 'error',
        message: actionState.apiError,
      });
    }
  }, [actionState]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value,
    }));

    setActionState({});
  };

  const showError = (message: string) => {
    setToastProps({
      ...toastProps,
      open: true,
      severity: 'error',
      message,
    });
  };

  const validatePasswords = (): boolean => {
    if (!settings.currentPassword.trim()) {
      showError('Current password is required');
      return false;
    }

    if (!settings.newPassword.trim()) {
      showError('New password is required');
      return false;
    }

    if (settings.newPassword.length < 8) {
      showError('New password must be at least 8 characters long');
      return false;
    }

    if (settings.currentPassword === settings.newPassword) {
      showError('New password must be different from current password');
      return false;
    }

    if (!settings.confirmNewPassword.trim()) {
      showError('Please confirm your new password');
      return false;
    }

    if (settings.newPassword !== settings.confirmNewPassword) {
      showError('New passwords do not match');
      return false;
    }

    if (passwordStrength.score < 40) {
      showError('Password is too weak. Please follow the suggestions to strengthen it.');
      return false;
    }

    return true;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePasswords()) {
      return;
    }

    const formData = new FormData();
    formData.append('currentPassword', settings.currentPassword);
    formData.append('newPassword', settings.newPassword);

    startTransition(async () => {
      try {
        const result = await updateUserPasswordAction({}, formData);
        setActionState(result);
      } catch (error) {
        setActionState({
          apiError: 'An unexpected error occurred',
          success: false,
        });
      }
    });
  };

  const isFormValid =
    settings.currentPassword && settings.newPassword && settings.confirmNewPassword && passwordStrength.score >= 40;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ mb: 3, width: '100%', maxWidth: 600, textAlign: { xs: 'center', sm: 'left' } }}>
        <Typography variant="h4" sx={{ ...SECTION_TITLE_STYLES, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
          Password Management
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
          Update your password to keep your account secure
        </Typography>
      </Box>

      <form onSubmit={handleChangePassword} style={{ width: '100%', maxWidth: 600 }}>
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            p: { xs: 3, md: 4 },
          }}
        >
          <Typography variant="h6" sx={{ ...SECTION_TITLE_STYLES, fontSize: '1.125rem', mb: 3 }}>
            Change Password
          </Typography>

          <Stack spacing={{ xs: 2, sm: 3 }}>
            <TextField
              id="password-current"
              fullWidth
              label="Current Password"
              type={showCurrentPassword ? 'text' : 'password'}
              name="currentPassword"
              value={settings.currentPassword}
              onChange={handleInputChange}
              variant="outlined"
              disabled={isPending}
              error={!!actionState.zodErrors?.currentPassword}
              helperText={actionState.zodErrors?.currentPassword?.[0]}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        edge="end"
                        disabled={isPending}
                      >
                        {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              color="secondary"
            />

            <Box>
              <TextField
                id="password-new"
                fullWidth
                label="New Password"
                type={showNewPassword ? 'text' : 'password'}
                name="newPassword"
                value={settings.newPassword}
                onChange={handleInputChange}
                variant="outlined"
                disabled={isPending}
                error={!!actionState.zodErrors?.newPassword}
                helperText={actionState.zodErrors?.newPassword?.[0]}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          edge="end"
                          disabled={isPending}
                        >
                          {showNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                color="secondary"
              />

              {settings.newPassword && (
                <Box
                  sx={{
                    mt: 3,
                    p: 3,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: `${passwordStrength.color}.main`,
                    bgcolor: theme =>
                      theme.palette.mode === 'dark'
                        ? `${passwordStrength.color}.dark`
                        : `${passwordStrength.color}.lighter`,
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600}>
                      Password Strength
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color={`${passwordStrength.color}.main`}>
                      {passwordStrength.score >= 80
                        ? 'Strong'
                        : passwordStrength.score >= 60
                          ? 'Good'
                          : passwordStrength.score >= 40
                            ? 'Fair'
                            : 'Weak'}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={passwordStrength.score}
                    color={passwordStrength.color}
                    sx={{ height: 10, borderRadius: 5, mb: 2 }}
                  />
                  {passwordStrength.feedback.length > 0 && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={600}
                        sx={{ display: 'block', mb: 1 }}
                      >
                        Suggestions to improve:
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                        {passwordStrength.feedback.map((tip, index) => (
                          <Typography
                            key={index}
                            component="li"
                            variant="caption"
                            color="text.secondary"
                            sx={{ mb: 0.5 }}
                          >
                            {tip}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
            </Box>

            <TextField
              id="password-confirm"
              fullWidth
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmNewPassword"
              value={settings.confirmNewPassword}
              onChange={handleInputChange}
              variant="outlined"
              disabled={isPending}
              error={!!actionState.zodErrors?.confirmNewPassword}
              helperText={actionState.zodErrors?.confirmNewPassword?.[0]}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        disabled={isPending}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              color="secondary"
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" sx={{ mt: 3 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={!isFormValid || isPending}
              size="large"
              sx={{ ...BUTTON_STYLES, px: 4, width: { xs: '100%', sm: 'auto' } }}
            >
              {isPending ? 'Changing Password...' : 'Change Password'}
            </Button>
          </Stack>
        </Card>
      </form>
    </Box>
  );
}
