import InputBase from '@mui/material/InputBase';
import { SxProps, Theme, alpha, styled } from '@mui/material/styles';
import React from 'react';
import SearchIcon from '@mui/icons-material/Search';

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.text.secondary, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.text.secondary, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 4,
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: alpha(theme.palette.primary.light, 0.15),
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
  },
}));

const SearchInput = ({ sx }: { sx: SxProps<Theme> }) => {
  return (
    <Search sx={sx}>
      <SearchIconWrapper>
        <SearchIcon color="primary" />
      </SearchIconWrapper>
      <StyledInputBase
        placeholder="Search…"
        inputProps={{ 'aria-label': 'search' }}
      />
    </Search>
  );
};

export default SearchInput;
