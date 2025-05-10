import { PaletteOptions } from '@mui/material';
import { indigo, deepOrange, red } from '@mui/material/colors';

const lightModeColors: PaletteOptions = {
  primary: {
    light: deepOrange[300],
    main: deepOrange[700],
    dark: deepOrange[900],
    contrastText: '#FFFFFF',
  },
  secondary: {
    light: indigo[100],
    main: indigo[300],
    dark: indigo[700],
    contrastText: '#FFFFFF',
  },
  error: {
    main: red[500],
  },
  background: {
    default: '#F5F5F5',
    paper: '#FFFFFF',
  },
  text: {
    primary: '#212121',
    secondary: '#757575',
  },
  success: {
    main: '#4CAF50',
  },
};

export default lightModeColors;
