'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Delete as DeleteIcon,
  Security as SecurityIcon
} from '@mui/icons-material';

interface AccountSettings {
  username: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export default function AccountSettingsPage() {
  const [settings, setSettings] = useState<AccountSettings>({
    username: 'johndoe',
    email: 'john.doe@example.com',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [openDeleteAccountDialog, setOpenDeleteAccountDialog] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear password error when typing
    if (name.includes('Password')) {
      setPasswordError('');
    }
  };

  const handleChangePassword = () => {
    // Validate password change
    if (!settings.currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    if (settings.newPassword !== settings.confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (settings.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }

    // TODO: Implement actual password change logic (API call, etc.)
    console.log('Changing password');
    // Reset password fields after successful change
    setSettings(prev => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    }));
    setPasswordError('');
  };

  const handleDeleteAccount = () => {
    // TODO: Implement actual account deletion logic (API call, etc.)
    console.log('Deleting account');
    setOpenDeleteAccountDialog(false);
  };

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'pt', label: 'Portuguese' }
  ];

  const timeZones = [
    { value: 'America/New_York', label: 'Eastern Time (New York)' },
    { value: 'America/Chicago', label: 'Central Time (Chicago)' },
    { value: 'America/Denver', label: 'Mountain Time (Denver)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
    { value: 'America/Anchorage', label: 'Alaska Time (Anchorage)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (Honolulu)' }
  ];

  return (
    <Box sx={{ p: 3, maxWidth: 600, margin: 'auto' }}>
      <Paper elevation={3} sx={{ padding: 3, borderRadius: 2 }}>
        <Typography variant="h4" fontWeight='bold' sx={{ mb: 5 }}>
          Account Settings
        </Typography>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={settings.username}
              onChange={handleInputChange}
              variant="outlined"
              InputProps={{
                readOnly: true,
              }}
              color='secondary'
              sx={{
                pb: 4,
              }}
              disabled
            />

            <TextField
              fullWidth
              label="Email"
              name="email"
              value={settings.email}
              onChange={handleInputChange}
              variant="outlined"
              color='secondary'
              sx={{
                pb: 4,
              }}
            />

            <FormControl
              fullWidth
              variant="outlined"
              sx={{
                pb: 4,
              }}
            >
              <InputLabel
                color='secondary'
              >
                Language
              </InputLabel>
              <Select
                name="language"
                // TODO value={settings.language}
                onChange={(e) => handleInputChange(e as React.ChangeEvent<HTMLInputElement>)}
                label="Language"
                color="secondary"
              >
                {languages.map((lang) => (
                  <MenuItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth variant="outlined">
              <InputLabel
                color='secondary'
              >
                Time Zone
              </InputLabel>
              <Select
                name="timeZone"
                // TODO value={settings.timeZone}
                onChange={(e) => handleInputChange(e as React.ChangeEvent<HTMLInputElement>)}
                label="Time Zone"
                color="secondary"
              >
                {timeZones.map((zone) => (
                  <MenuItem
                    key={zone.value}
                    value={zone.value}
                  >
                    {zone.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
              >
                Save Changes
              </Button>
            </Box>
          </Grid>

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
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          edge="end"
                        >
                          {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  color='secondary'
                  sx={{
                    pb: 4,
                  }}
                />

                <TextField
                  fullWidth
                  label="New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={settings.newPassword}
                  onChange={handleInputChange}
                  variant="outlined"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          edge="end"
                        >
                          {showNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  color='secondary'
                  sx={{
                    pb: 4,
                  }}
                />

                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmNewPassword"
                  value={settings.confirmNewPassword}
                  onChange={handleInputChange}
                  variant="outlined"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
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

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleChangePassword}
              >
                Change Password
              </Button>
            </Box>
          </Grid>

          <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
            <Typography variant="subtitle1" color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
              <DeleteIcon sx={{ mr: 1 }} />
              Delete Account
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Permanently remove your account and all associated data
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setOpenDeleteAccountDialog(true)}
            >
              Delete Account
            </Button>
          </Grid>
        </Grid>

        {/* Delete Account Confirmation Dialog */}
        <Dialog
          open={openDeleteAccountDialog}
          onClose={() => setOpenDeleteAccountDialog(false)}
        >
          <DialogTitle>Delete Account</DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              Are you sure you want to permanently delete your account?
              This action cannot be undone and will remove all your data.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDeleteAccountDialog(false)} color="secondary">
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAccount}
              color="primary"
              variant="contained"
            >
              Confirm Delete
            </Button>
          </DialogActions>
        </Dialog>
      </ Paper>
    </Box>
  );
};
