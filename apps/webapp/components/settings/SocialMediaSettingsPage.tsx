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
  Stack,
  InputAdornment,
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
import { BUTTON_STYLES, SECTION_TITLE_STYLES } from '@/lib/constants';
import { logger } from '@/lib/utils';

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
  const [customLink, setCustomLink] = useState('gatherle.com/johndoe');
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [tempLink, setTempLink] = useState(customLink);

  const handleToggleConnection = (id: string) => {
    setSocialAccounts((prevAccounts) =>
      prevAccounts.map((account) => (account.id === id ? { ...account, connected: !account.connected } : account)),
    );
  };

  const handleSaveLink = () => {
    setCustomLink(tempLink);
    setIsEditingLink(false);
  };

  const handleSaveSettings = () => {
    // TODO: Implement actual save logic (API call, etc.)
    logger.info('Social media settings saved:', {
      accounts: socialAccounts,
      shareOnSocialMedia,
      customLink,
    });
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ ...SECTION_TITLE_STYLES, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
          Social Media Settings
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
          Connect your social accounts and manage sharing preferences
        </Typography>
      </Box>

      <Stack spacing={3}>
        {/* Connected Accounts */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            p: 3,
          }}
        >
          <Typography variant="h6" sx={{ ...SECTION_TITLE_STYLES, fontSize: '1.125rem', mb: 3 }}>
            Connected Accounts
          </Typography>

          <Grid container spacing={{ xs: 2, sm: 2.5 }}>
            {socialAccounts.map((account) => (
              <Grid size={{ xs: 12 }} key={account.id}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    bgcolor: account.connected ? 'success.lighter' : 'background.default',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: account.connected ? 'success.lighter' : 'action.hover',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Grid
                      container
                      spacing={2}
                      alignItems="center"
                      direction={isSmallScreen ? 'column' : 'row'}
                      textAlign={isSmallScreen ? 'center' : 'left'}
                    >
                      <Grid {...(!isSmallScreen && { size: { xs: 1 } })}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: 'background.default',
                          }}
                        >
                          {account.icon}
                        </Box>
                      </Grid>
                      <Grid {...(!isSmallScreen && { size: { xs: 6 } })}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {account.platform}
                          </Typography>
                          {account.connected && (
                            <Box
                              sx={{
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 1,
                                bgcolor: 'success.lighter',
                                border: '1px solid',
                                borderColor: 'success.light',
                              }}
                            >
                              <Typography variant="caption" fontWeight={600} color="success.main">
                                Connected
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {account.connected ? account.username : 'Not connected'}
                        </Typography>
                      </Grid>
                      <Grid
                        {...(!isSmallScreen && { size: { xs: 5 } })}
                        sx={{ textAlign: isSmallScreen ? 'center' : 'right' }}
                      >
                        <Button
                          variant={account.connected ? 'outlined' : 'contained'}
                          color={account.connected ? 'error' : 'primary'}
                          size="large"
                          onClick={() => handleToggleConnection(account.id)}
                          sx={{
                            ...BUTTON_STYLES,
                            px: 3,
                            width: { xs: '100%', sm: 'auto' },
                          }}
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
        </Card>

        {/* Sharing Preferences */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            p: 3,
          }}
        >
          <Typography variant="h6" sx={{ ...SECTION_TITLE_STYLES, fontSize: '1.125rem', mb: 3 }}>
            Sharing Preferences
          </Typography>

          <Box sx={{ py: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={shareOnSocialMedia}
                  onChange={() => setShareOnSocialMedia(!shareOnSocialMedia)}
                  color="secondary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight={600}>
                    Auto-share Activities
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Automatically share your events and activities on connected social media platforms
                  </Typography>
                </Box>
              }
            />
          </Box>
        </Card>

        {/* Custom Profile Link */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            p: 3,
          }}
        >
          <Typography variant="h6" sx={{ ...SECTION_TITLE_STYLES, fontSize: '1.125rem', mb: 3 }}>
            Custom Profile Link
          </Typography>

          {isEditingLink ? (
            <Stack spacing={2}>
              <TextField
                value={tempLink}
                onChange={(e) => setTempLink(e.target.value)}
                fullWidth
                placeholder="Enter your custom link"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LinkIcon sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  },
                }}
                color="secondary"
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end">
                <Button
                  onClick={() => {
                    setIsEditingLink(false);
                    setTempLink(customLink);
                  }}
                  variant="outlined"
                  sx={{ ...BUTTON_STYLES, width: { xs: '100%', sm: 'auto' } }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveLink}
                  variant="contained"
                  color="primary"
                  sx={{ ...BUTTON_STYLES, width: { xs: '100%', sm: 'auto' } }}
                >
                  Save Link
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 3,
                borderRadius: 3,
                bgcolor: 'background.default',
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    bgcolor: 'secondary.lighter',
                  }}
                >
                  <LinkIcon sx={{ color: 'secondary.main' }} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Your profile link
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {customLink}
                  </Typography>
                </Box>
              </Stack>
              <Button
                onClick={() => setIsEditingLink(true)}
                startIcon={<EditIcon />}
                variant="outlined"
                color="primary"
                sx={{ ...BUTTON_STYLES }}
              >
                Edit
              </Button>
            </Box>
          )}
        </Card>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" sx={{ mt: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveSettings}
          size="large"
          sx={{ ...BUTTON_STYLES, px: 4, width: { xs: '100%', sm: 'auto' } }}
        >
          Save Changes
        </Button>
      </Stack>
    </Box>
  );
}
