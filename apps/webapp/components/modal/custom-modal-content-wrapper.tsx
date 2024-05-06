import { styled } from '@mui/system';
import { Box } from '@mui/material';
import { ReactNode } from 'react';

const CustomModalContentWrapper = ({ children }: { children: ReactNode }) => {
  const CustomModalContent = styled(Box)(({ theme }) => ({
    fontWeight: 500,
    textAlign: 'start',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    overflow: 'hidden',
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : '#fff',
    borderRadius: 8,
    border: `1px solid ${theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[200]}`,
    boxShadow: `0 4px 12px ${theme.palette.mode === 'dark' ? 'rgb(0 0 0 / 0.5)' : 'rgb(0 0 0 / 0.2)'}`,
    padding: 20,
    color: theme.palette.mode === 'dark' ? theme.palette.grey[50] : theme.palette.grey[900],
    '& .modal-title': {
      margin: 0,
      lineHeight: '1.5rem',
      marginBottom: 8,
    },
    '& .modal-description': {
      margin: 0,
      lineHeight: '1.5rem',
      fontWeight: 400,
      color: theme.palette.mode === 'dark' ? theme.palette.grey[400] : theme.palette.grey[800],
      marginBottom: 4,
    },
    [theme.breakpoints.up('sm')]: {
      padding: 50,
    },
    [theme.breakpoints.up('md')]: {
      padding: 70,
    },
  }));

  return <CustomModalContent>{children}</CustomModalContent>;
};

export default CustomModalContentWrapper;
