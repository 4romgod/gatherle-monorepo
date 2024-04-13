'use client';

import { createTheme } from '@mui/material/styles';
import { inter } from '@/components/theme/fonts';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00695f',
      light: '',
      dark: '',
      contrastText: '',
    },
  },
  typography: {
    fontFamily: inter.style.fontFamily,
    fontSize: 10,
  },
});

export default theme;
