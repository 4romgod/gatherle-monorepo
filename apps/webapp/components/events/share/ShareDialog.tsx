import type { MouseEvent } from 'react';
import { Box, Button, Dialog, DialogContent, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import { Close, Search } from '@mui/icons-material';
import type { ShareUser } from './share-utils';
import ShareUserGrid from './ShareUserGrid';
import SharePlatformBar from './SharePlatformBar';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  stopPropagation?: boolean;
  eventTitle: string;
  resolvedEventUrl: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  users: ShareUser[];
  loading: boolean;
  selectedUserIds: Set<string>;
  sentUserIds: Set<string>;
  onToggleUser: (userId: string) => void;
  onSend: () => void;
  onCopyLink: () => void;
}

export default function ShareDialog({
  open,
  onClose,
  stopPropagation = false,
  eventTitle,
  resolvedEventUrl,
  searchValue,
  onSearchChange,
  users,
  loading,
  selectedUserIds,
  sentUserIds,
  onToggleUser,
  onSend,
  onCopyLink,
}: ShareDialogProps) {
  const selectedCount = selectedUserIds.size;

  const stopDialogClickBubbling = (event: MouseEvent<HTMLElement>) => {
    if (!stopPropagation) {
      return;
    }
    event.stopPropagation();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onClick={stopDialogClickBubbling}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            bgcolor: 'background.paper',
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'divider',
          },
        },
      }}
    >
      <DialogContent sx={{ p: 0, backgroundColor: 'background.default' }}>
        {/* Header: close, title, send */}
        <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <IconButton
              onClick={onClose}
              aria-label="Close share dialog"
              sx={{ color: 'text.secondary', width: 34, height: 34 }}
            >
              <Close />
            </IconButton>
            <Typography variant="h6" fontWeight={700}>
              Share
            </Typography>
            <Button
              size="small"
              variant="contained"
              disabled={selectedCount === 0}
              onClick={onSend}
              sx={{
                minWidth: 78,
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: selectedCount ? 'primary.main' : undefined,
              }}
            >
              {selectedCount > 0 ? `Send (${selectedCount})` : 'Send'}
            </Button>
          </Box>

          <TextField
            fullWidth
            size="small"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search"
            slotProps={{
              input: {
                'aria-label': 'Search people to share with',
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                backgroundColor: 'background.default',
                color: 'text.primary',
              },
              '& .MuiInputBase-input::placeholder': {
                color: 'text.secondary',
                opacity: 1,
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'divider',
              },
            }}
          />
        </Box>

        {/* User grid */}
        <Box
          sx={{
            px: 2,
            pb: 1.25,
            minHeight: 260,
            maxHeight: 420,
            overflowY: 'auto',
          }}
        >
          <ShareUserGrid
            users={users}
            loading={loading}
            searchValue={searchValue}
            selectedUserIds={selectedUserIds}
            sentUserIds={sentUserIds}
            onToggleUser={onToggleUser}
          />
        </Box>

        {/* Platform share buttons */}
        <SharePlatformBar eventTitle={eventTitle} resolvedEventUrl={resolvedEventUrl} onCopyLink={onCopyLink} />
      </DialogContent>
    </Dialog>
  );
}
