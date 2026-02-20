'use client';

import React from 'react';
import { Box, Container, Grid, Typography, Link, Divider, Button } from '@mui/material';
import darkModeColors from '@/components/theme/colors/DarkMode';
import { footerSections, socialLinks } from './NavigationItems';
import { ROUTES } from '@/lib/constants';
import { BUTTON_STYLES, SECTION_TITLE_STYLES } from '@/lib/constants';

const Footer = () => {
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
        {/* CTA Card - Elevation Zero */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
            gap: 3,
            p: { xs: 3, md: 4 },
            borderRadius: 3,
            backgroundColor: 'background.paper',
            mb: 6,
          }}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{
                color: 'primary.main',
                fontWeight: 700,
                fontSize: '0.75rem',
                letterSpacing: '0.1em',
              }}
            >
              GET STARTED
            </Typography>
            <Typography variant="h5" sx={{ ...SECTION_TITLE_STYLES, mt: 0.5 }}>
              Bring people together with Gatherle
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 520, mt: 1, lineHeight: 1.6 }}>
              Craft intimate gatherings, bold conferences, or community rituals with the platform built for modern
              hosts.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              href={ROUTES.ACCOUNT.EVENTS.CREATE}
              sx={{ ...BUTTON_STYLES, px: 3 }}
            >
              Host an experience
            </Button>
            <Button variant="outlined" color="inherit" href={ROUTES.EVENTS.ROOT} sx={{ ...BUTTON_STYLES, px: 3 }}>
              Browse events
            </Button>
          </Box>
        </Box>

        {/* Footer Links */}
        <Grid container spacing={4}>
          {footerSections.map((section) => (
            <Grid size={{ xs: 6, sm: 3 }} key={section.title}>
              <Typography
                variant="overline"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  letterSpacing: '0.1em',
                  display: 'block',
                  mb: 2,
                }}
              >
                {section.title}
              </Typography>
              <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                {section.links.map((link) => (
                  <Box component="li" key={link.name} sx={{ mb: 1 }}>
                    <Link
                      href={link.href}
                      underline="hover"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        transition: 'color 0.2s ease',
                        '&:hover': { color: 'primary.main' },
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

        <Divider sx={{ my: 4, borderColor: 'divider' }} />

        {/* Bottom Bar */}
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
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
                    fontSize: '1.25rem',
                    transition: 'color 0.2s ease',
                    '&:hover': { color: 'primary.main' },
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
