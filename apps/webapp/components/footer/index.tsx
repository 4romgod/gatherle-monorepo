'use client';

import React from 'react';
import { Box, Container, Grid, Typography, Link, Divider } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import darkModeColors from '@/components/theme/colors/dark-mode';
import ToggleThemeMode from '@/components/theme/toggle-theme-mode';
import { useCustomAppContext } from '@/components/app-context';
import { footerSections, socialLinks } from './navigation-items';

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
        padding: 4,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {footerSections.map((section) => (
            <Grid item xs={6} sm={3} key={section.title}>
              <Typography 
                variant="h6" 
                fontWeight="bold" 
                gutterBottom
                color={theme.palette.text.secondary}
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
                        '&:hover': { color: 'primary.main' }
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

        <ToggleThemeMode setThemeMode={setThemeMode} themeMode={themeMode} />

        <Divider sx={{ my: 4 }} />
        
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              © {currentYear} Mapapa Solutions (Pty) Ltd. All rights reserved.
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box 
              sx={{ 
                display: 'flex', 
                gap: 2,
                justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                mt: { xs: 2, sm: 0 } 
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
                    '&:hover': { color: 'primary.main' }
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
