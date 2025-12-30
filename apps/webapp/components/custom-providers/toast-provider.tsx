'use client';

import React from 'react';
import { useCustomAppContext } from '@/components/app-context';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

export default function ToastProvider() {
  const { toastProps, setToastProps } = useCustomAppContext();
  const { open, anchorOrigin, autoHideDuration, severity, message } = toastProps;

  const handleClose = () => {
    setToastProps({ ...toastProps, open: false });
  };

  return (
    <Snackbar open={open} onClose={handleClose} autoHideDuration={autoHideDuration} anchorOrigin={anchorOrigin}>
      <Alert onClose={handleClose} severity={severity} variant="filled" sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
}
