'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Alert,
  IconButton,
  InputAdornment,
  LinearProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Security as SecurityIcon
} from '@mui/icons-material';
import { updateUserPasswordAction } from '@/data/actions/server/user/update-user-password';

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
  const [settings, setSettings] = useState<PasswordSettings>({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const [actionState, setActionState] = useState<ActionState>({});

  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: [],
    color: 'error'
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

    const commonPatterns = [
      /123/i, /abc/i, /password/i, /qwerty/i, /admin/i,
      /(\w)\1{2,}/i
    ];

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
      setSuccessMessage('Password changed successfully!');
      setPasswordError('');
      setSettings({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      });
    } else if (actionState.apiError) {
      setPasswordError(actionState.apiError);
      setSuccessMessage('');
    }
  }, [actionState]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));

    setPasswordError('');
    setSuccessMessage('');
    setActionState({});
  };

  const validatePasswords = (): boolean => {
    if (!settings.currentPassword.trim()) {
      setPasswordError('Current password is required');
      return false;
    }

    if (!settings.newPassword.trim()) {
      setPasswordError('New password is required');
      return false;
    }

    if (settings.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return false;
    }

    if (settings.currentPassword === settings.newPassword) {
      setPasswordError('New password must be different from current password');
      return false;
    }

    if (!settings.confirmNewPassword.trim()) {
      setPasswordError('Please confirm your new password');
      return false;
    }

    if (settings.newPassword !== settings.confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return false;
    }

    if (passwordStrength.score < 40) {
      setPasswordError('Password is too weak. Please follow the suggestions to strengthen it.');
      return false;
    }

    return true;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswords()) {
      return;
    }

    setPasswordError('');
    setSuccessMessage('');

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
          success: false
        });
      }
    });
  };

  const isFormValid = settings.currentPassword && settings.newPassword && settings.confirmNewPassword && passwordStrength.score >= 40;

  return (
    <Box sx={{ p: 3, maxWidth: 600, margin: 'auto' }}>
      <Typography variant="h4" fontWeight='bold' sx={{ mb: 5 }}>
        Password Management
      </Typography>

      <form onSubmit={handleChangePassword}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <SecurityIcon sx={{ mr: 1, color: 'text.secondary' }} />
              Change Password
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Current Password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  name="currentPassword"
                  value={settings.currentPassword}
                  onChange={handleInputChange}
                  variant="outlined"
                  disabled={isPending}
                  error={(passwordError.includes('Current password') || !!actionState.zodErrors?.currentPassword)}
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
                      )
                    }
                  }}
                  color='secondary'
                  sx={{ pb: 4 }}
                />

                <TextField
                  fullWidth
                  label="New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={settings.newPassword}
                  onChange={handleInputChange}
                  variant="outlined"
                  disabled={isPending}
                  error={(passwordError.includes('New password') || passwordError.includes('Password is too weak') || !!actionState.zodErrors?.newPassword)}
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
                      )
                    }
                  }}
                  color='secondary'
                  sx={{ pb: 4 }}
                />

                {settings.newPassword && (
                  <Box sx={{ mb: 3, mt: -3 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Password Strength: {passwordStrength.score}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={passwordStrength.score}
                      color={passwordStrength.color}
                      sx={{ height: 8, borderRadius: 4, mb: 1 }}
                    />
                    {passwordStrength.feedback.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Suggestions: {passwordStrength.feedback.join(', ')}
                      </Typography>
                    )}
                  </Box>
                )}

                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmNewPassword"
                  value={settings.confirmNewPassword}
                  onChange={handleInputChange}
                  variant="outlined"
                  disabled={isPending}
                  error={(passwordError.includes('do not match') || passwordError.includes('confirm') || !!actionState.zodErrors?.confirmNewPassword)}
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
                      )
                    }
                  }}
                  color='secondary'
                />
              </Grid>
            </Grid>

            {passwordError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {passwordError}
              </Alert>
            )}

            {successMessage && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {successMessage}
              </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={!isFormValid || isPending}
                sx={{ minWidth: 140 }}
              >
                {isPending ? 'Changing...' : 'Change Password'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};
