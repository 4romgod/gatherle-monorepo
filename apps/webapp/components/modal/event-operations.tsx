'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LinkIcon from '@mui/icons-material/Link';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PushPinIcon from '@mui/icons-material/PushPin';
import { Dialog, DialogContent, IconButton, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { deleteEventAction } from '@/data/actions/server/events/delete-event';
import { EventDetail } from '@/data/graphql/query/Event/types';
import { ROUTES } from '@/lib/constants';
import Link from 'next/link';
import { useCustomAppContext } from '../app-context';

const EventOperationsModal = ({ event }: { event: EventDetail }) => {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setToastProps, toastProps } = useCustomAppContext();

  const handleDialogOpen = () => {
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleDeleteEvent = async () => {
    const deleteResponse = await deleteEventAction(event.eventId);
    if (deleteResponse.apiError) {
      setToastProps({
        ...toastProps,
        open: true,
        severity: 'error',
        message: deleteResponse.apiError,
      });
    }

    if (deleteResponse.message) {
      setToastProps({
        ...toastProps,
        open: true,
        severity: 'success',
        message: deleteResponse.message,
      });
    }

    router.replace(ROUTES.ACCOUNT.EVENTS.ROOT);

    handleDialogClose();
  };

  return (
    <div>
      <IconButton onClick={handleDialogOpen}>
        <MoreVertIcon />
      </IconButton>
      <Dialog open={dialogOpen} onClose={handleDialogClose}>
        <DialogContent>
          <List>
            <Link href={ROUTES.ACCOUNT.EVENTS.EDIT_EVENT(event.slug)}>
              <ListItemButton onClick={handleDialogClose}>
                <ListItemIcon>
                  <EditIcon />
                </ListItemIcon>
                <ListItemText primary="Edit event" />
              </ListItemButton>
            </Link>
            <ListItemButton onClick={handleDeleteEvent}>
              <ListItemIcon>
                <DeleteIcon />
              </ListItemIcon>
              <ListItemText primary="Delete event" />
            </ListItemButton>
            <ListItemButton onClick={handleDialogClose}>
              <ListItemIcon>
                <PushPinIcon />
              </ListItemIcon>
              <ListItemText primary="Pin to top" />
            </ListItemButton>
            <ListItemButton onClick={handleDialogClose}>
              <ListItemIcon>
                <LinkIcon />
              </ListItemIcon>
              <ListItemText primary="Copy Link to Event" />
            </ListItemButton>
          </List>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventOperationsModal;
