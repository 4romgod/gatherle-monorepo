import { PaletteOptions } from '@mui/material';
import { cyan, lightGreen, deepOrange } from '@mui/material/colors';

const lightModeColors: PaletteOptions = {
  primary: {
    light: cyan[500],
    main: cyan[700],
    dark: cyan[900],
    contrastText: '#FFFFFF',
  },
  secondary: {
    light: lightGreen[500],
    main: lightGreen[700],
    dark: lightGreen[900],
    contrastText: '#FFFFFF',
  },
  error: {
    main: deepOrange[500],
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
