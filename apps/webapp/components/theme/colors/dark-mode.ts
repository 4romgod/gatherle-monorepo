import { PaletteOptions } from '@mui/material';
import { indigo, deepOrange } from '@mui/material/colors';

const darkModeColors: PaletteOptions = {
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
    main: deepOrange[500],
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
