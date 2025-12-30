'use client';

import React, { JSX, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Facebook,
  Twitter,
  Instagram,
  LinkedIn,
  YouTube,
  Link as LinkIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  connected: boolean;
  icon: JSX.Element;
}

export default function SocialMediaSettingsPage() {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([
    {
      id: '1',
      platform: 'Facebook',
      username: 'johndoe',
      connected: true,
      icon: <Facebook sx={{ color: '#1877F2' }} />,
    },
    {
      id: '2',
      platform: 'Twitter',
      username: '@johndoe',
      connected: true,
      icon: <Twitter sx={{ color: '#1DA1F2' }} />,
    },
    {
      id: '3',
      platform: 'Instagram',
      username: 'johndoe',
      connected: false,
      icon: <Instagram sx={{ color: '#E4405F' }} />,
    },
    {
      id: '4',
      platform: 'LinkedIn',
      username: 'john-doe',
      connected: false,
      icon: <LinkedIn sx={{ color: '#0A66C2' }} />,
    },
    {
      id: '5',
      platform: 'YouTube',
      username: 'JohnDoeChannel',
      connected: false,
      icon: <YouTube sx={{ color: '#FF0000' }} />,
    },
  ]);

  const [shareOnSocialMedia, setShareOnSocialMedia] = useState(true);
  const [customLink, setCustomLink] = useState('ntlango.com/johndoe');
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [tempLink, setTempLink] = useState(customLink);

  const handleToggleConnection = (id: string) => {
    setSocialAccounts(prevAccounts =>
      prevAccounts.map(account => (account.id === id ? { ...account, connected: !account.connected } : account)),
    );
  };

  const handleSaveLink = () => {
    setCustomLink(tempLink);
    setIsEditingLink(false);
  };

  const handleSaveSettings = () => {
    // TODO: Implement actual save logic (API call, etc.)
    console.log('Social media settings saved:', {
      accounts: socialAccounts,
      shareOnSocialMedia,
      customLink,
    });
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, margin: 'auto' }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 5 }}>
        Social Media Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Connected Accounts
          </Typography>
          <Grid container spacing={2}>
            {socialAccounts.map(account => (
              <Grid size={{ xs: 12 }} key={account.id}>
                <Card variant="outlined">
                  <CardContent sx={{ py: 1 }}>
                    <Grid
                      container
                      spacing={2}
                      alignItems="center"
                      direction={isSmallScreen ? 'column' : 'row'}
                      textAlign={isSmallScreen ? 'center' : 'left'}
                    >
                      <Grid {...(!isSmallScreen && { size: { xs: 1 } })}>{account.icon}</Grid>
                      <Grid {...(!isSmallScreen && { size: { xs: 6 } })}>
                        <Typography variant="subtitle1">{account.platform}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {account.username}
                        </Typography>
                      </Grid>
                      <Grid {...(!isSmallScreen && { size: { xs: 5 } })}>
                        <Button
                          variant={account.connected ? 'outlined' : 'contained'}
                          color={account.connected ? 'secondary' : 'primary'}
                          size="small"
                          onClick={() => handleToggleConnection(account.id)}
                        >
                          {account.connected ? 'Disconnect' : 'Connect'}
                        </Button>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Sharing Preferences
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={shareOnSocialMedia}
                onChange={() => setShareOnSocialMedia(!shareOnSocialMedia)}
                color="secondary"
              />
            }
            label="Share my events and activities on connected social media"
          />
        </Grid>

        <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Custom Profile Link
          </Typography>
          {isEditingLink ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <TextField
                value={tempLink}
                onChange={e => setTempLink(e.target.value)}
                size="small"
                fullWidth
                placeholder="Enter your custom link"
                slotProps={{
                  input: {
                    startAdornment: <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  },
                }}
              />
              <Box>
                <Button onClick={handleSaveLink} variant="contained" color="primary" size="small">
                  Save
                </Button>
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography>{customLink}</Typography>
              </Box>
              <Button onClick={() => setIsEditingLink(true)} size="small" startIcon={<EditIcon />}>
                Edit
              </Button>
            </Box>
          )}
        </Grid>

        <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" color="primary" onClick={handleSaveSettings}>
              Save Changes
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
