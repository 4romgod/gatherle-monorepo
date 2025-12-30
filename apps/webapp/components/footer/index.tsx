'use client';

import React from 'react';
import { Box, Container, Grid, Typography, Link, Divider, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import darkModeColors from '@/components/theme/colors/dark-mode';
import ToggleThemeMode from '@/components/theme/toggle-theme-mode';
import { useCustomAppContext } from '@/components/app-context';
import { footerSections, socialLinks } from './navigation-items';
import { ROUTES } from '@/lib/constants';

const Footer = () => {
  const theme = useTheme();
  const { themeMode, setThemeMode } = useCustomAppContext();

  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: darkModeColors.background?.default,
        mt: 'auto',
        pt: { xs: 6, md: 8 },
        pb: { xs: 5, md: 7 },
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
            gap: 3,
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            backgroundColor: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.75)' : 'rgba(17,26,47,0.75)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.25)',
            mb: 6,
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Bring people together with Ntlango
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 520 }}>
              Craft intimate gatherings, bold conferences, or community rituals with the platform built for modern
              hosts.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Button variant="contained" color="secondary" href={ROUTES.ACCOUNT.EVENTS.CREATE}>
              Host an experience
            </Button>
            <Button variant="outlined" color="inherit" href={ROUTES.EVENTS.ROOT}>
              Browse events
            </Button>
          </Box>
        </Box>

        <Grid container spacing={4}>
          {footerSections.map(section => (
            <Grid size={{ xs: 6, sm: 3 }} key={section.title}>
              <Typography variant="h6" fontWeight="bold" gutterBottom color={theme.palette.text.primary}>
                {section.title}
              </Typography>
              <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                {section.links.map(link => (
                  <Box component="li" key={link.name} sx={{ mb: 1 }}>
                    <Link
                      href={link.href}
                      underline="hover"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.95rem',
                        '&:hover': { color: 'secondary.main' },
                      }}
                    >
                      {link.name}
                    </Link>
                  </Box>
                ))}
              </Box>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <ToggleThemeMode setThemeMode={setThemeMode} themeMode={themeMode} />
        </Box>

        <Divider sx={{ my: 4, borderColor: 'divider' }} />

        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">
              © {currentYear} Mapapa Solutions (Pty) Ltd. All rights reserved.
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                mt: { xs: 2, sm: 0 },
              }}
            >
              {socialLinks.map((social, index) => (
                <Link
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '1.35rem',
                    '&:hover': { color: 'secondary.main' },
                  }}
                >
                  {social.icon}
                </Link>
              ))}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Footer;
