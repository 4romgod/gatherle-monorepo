'use client';

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography, Box } from '@mui/material';
import { MembershipAction, PendingMembershipConfirmation } from './types';

interface MembershipConfirmationDialogProps {
  open: boolean;
  pendingMembershipConfirmation: PendingMembershipConfirmation | null;
  membershipAction: MembershipAction | null;
  onClose: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
}

const getDialogTitle = (pending: PendingMembershipConfirmation | null) => {
  if (!pending) return '';
  switch (pending.type) {
    case 'add':
      return 'Confirm invite';
    case 'role':
      return 'Confirm role change';
    case 'remove':
      return 'Confirm removal';
  }
};

const getDialogContent = (pending: PendingMembershipConfirmation | null) => {
  if (!pending) return null;
  switch (pending.type) {
    case 'add':
      return (
        <Box>
          <Typography variant="body2">
            You are about to invite <strong>{pending.user.username || pending.user.email || 'this user'}</strong> as{' '}
            <strong>{pending.role}</strong>.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            They will receive access to the organization immediately after the invite succeeds.
          </Typography>
        </Box>
      );
    case 'role':
      return (
        <Box>
          <Typography variant="body2">
            You are about to change{' '}
            <strong>{pending.membership.username || pending.membership.userId || 'this member'}</strong> from{' '}
            <strong>{pending.membership.role}</strong> to <strong>{pending.newRole}</strong>.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will update their permissions inside the organization.
          </Typography>
        </Box>
      );
    case 'remove':
      return (
        <Box>
          <Typography variant="body2">
            You are about to remove{' '}
            <strong>{pending.membership.username || pending.membership.userId || 'this member'}</strong>.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Removing them revokes all organization access—this cannot be undone.
          </Typography>
        </Box>
      );
  }
};

const getConfirmLabel = (membershipAction: MembershipAction | null) => {
  if (!membershipAction) return 'Confirm';
  switch (membershipAction.type) {
    case 'add':
      return 'Inviting...';
    case 'update':
      return 'Updating...';
    case 'remove':
      return 'Removing...';
  }
};

export default function MembershipConfirmationDialog({
  open,
  pendingMembershipConfirmation,
  membershipAction,
  onClose,
  onConfirm,
  isProcessing,
}: MembershipConfirmationDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{getDialogTitle(pendingMembershipConfirmation)}</DialogTitle>
      <DialogContent>{getDialogContent(pendingMembershipConfirmation)}</DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isProcessing}>
          Cancel
        </Button>
        <Button onClick={onConfirm} variant="contained" disabled={isProcessing}>
          {getConfirmLabel(membershipAction)}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
