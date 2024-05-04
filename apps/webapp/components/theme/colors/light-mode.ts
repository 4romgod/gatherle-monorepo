import { PaletteOptions } from '@mui/material';
import { indigo as primaryColor } from '@mui/material/colors';

const lightModeColors: PaletteOptions = {
  primary: {
    light: primaryColor[300],
    main: primaryColor[500],
    dark: primaryColor[700],
  },
  secondary: {
    light: '#ebe252',
    main: '#c9ba45',
    dark: '#947e35',
  },
  error: {
    main: '#f44336',
  },
  background: {
    default: '#FFFFFF',
    paper: '#f6f7fe',
  },
  text: {
    primary: '#121318',
    secondary: '#666666',
  },
};

export default lightModeColors;
