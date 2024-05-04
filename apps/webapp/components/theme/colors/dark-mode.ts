import { PaletteOptions } from '@mui/material';
import { indigo as primaryColor } from '@mui/material/colors';

const darkModeColors: PaletteOptions = {
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
    default: '#121318',
    paper: '#323338',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#CCCCCC',
  },
};

export default darkModeColors;
