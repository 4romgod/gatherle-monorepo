'use client';

import { useState } from 'react';
import { Button, Snackbar, Alert } from '@mui/material';
import { Check, ContentCopy } from '@mui/icons-material';

interface CopyLinkButtonProps {
  url: string;
}

export default function CopyLinkButton({ url }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setOpen(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="contained"
        size="small"
        startIcon={copied ? <Check /> : <ContentCopy />}
        onClick={handleCopy}
        sx={{ 
          mt: 2, 
          fontWeight: 600, 
          textTransform: 'none',
          transition: 'all 0.2s ease',
        }}
      >
        {copied ? 'Copied!' : 'Copy Link'}
      </Button>
      
      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleClose} severity="success" variant="filled" sx={{ width: '100%' }}>
          Link copied to clipboard!
        </Alert>
      </Snackbar>
    </>
  );
}
