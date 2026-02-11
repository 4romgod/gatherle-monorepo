'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { Add, CheckCircleOutline, RemoveCircleOutline } from '@mui/icons-material';
import { Button, CircularProgress } from '@mui/material';
import { signIn, useSession } from 'next-auth/react';
import { updateUserProfileAction } from '@/data/actions/server/user';
import { EventCategory, User } from '@/data/graphql/types/graphql';
import { useAppContext } from '@/hooks/useAppContext';

type CategoryInterestToggleButtonProps = {
  category: Pick<EventCategory, 'eventCategoryId' | 'name'>;
};

type InterestAction = 'add' | 'remove' | null;

const initialState = {
  apiError: null,
  zodErrors: null,
};

export default function CategoryInterestToggleButton({ category }: CategoryInterestToggleButtonProps) {
  const { data: session, status } = useSession();
  const { setToastProps } = useAppContext();
  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useActionState(updateUserProfileAction, initialState);
  const [interestAction, setInterestAction] = useState<InterestAction>(null);

  const interests = session?.user?.interests ?? [];
  const interestIds = interests
    .map((interest) => interest?.eventCategoryId)
    .filter((interestId): interestId is string => Boolean(interestId));

  const isInterested = interestIds.includes(category.eventCategoryId);

  const handleToggleInterest = () => {
    if (!session?.user?.userId) {
      return;
    }

    const nextInterestIds = isInterested
      ? interestIds.filter((interestId) => interestId !== category.eventCategoryId)
      : Array.from(new Set([...interestIds, category.eventCategoryId]));

    setInterestAction(isInterested ? 'remove' : 'add');

    const formData = new FormData();
    formData.append('userId', session.user.userId);
    formData.append('interests', JSON.stringify(nextInterestIds));

    startTransition(() => {
      formAction(formData);
    });
  };

  useEffect(() => {
    if (!state.apiError) {
      return;
    }

    setInterestAction(null);
    const errorMessage = state.apiError || 'Failed to update your interests';
    setToastProps((prev) => ({
      ...prev,
      open: true,
      severity: 'error',
      message: errorMessage,
    }));
  }, [setToastProps, state.apiError]);

  useEffect(() => {
    if (!state.data || !session?.user?.token || !interestAction) {
      return;
    }

    const updatedUser = state.data as User;
    const refreshSession = async () => {
      await signIn('refresh-session', {
        userData: JSON.stringify(updatedUser),
        token: session.user.token,
        redirect: false,
      });

      setToastProps((prev) => ({
        ...prev,
        open: true,
        severity: 'success',
        message:
          interestAction === 'add'
            ? `${category.name} added to your interests`
            : `${category.name} removed from your interests`,
      }));
      setInterestAction(null);
    };

    refreshSession();
  }, [category.name, interestAction, session?.user?.token, setToastProps, state.data]);

  if (status !== 'authenticated' || !session?.user?.token) {
    return null;
  }

  return (
    <Button
      variant={isInterested ? 'outlined' : 'contained'}
      color={isInterested ? 'secondary' : 'primary'}
      onClick={handleToggleInterest}
      disabled={isPending}
      startIcon={
        isPending ? (
          <CircularProgress size={16} color="inherit" />
        ) : isInterested ? (
          <RemoveCircleOutline fontSize="small" />
        ) : (
          <Add fontSize="small" />
        )
      }
      endIcon={!isPending && isInterested ? <CheckCircleOutline fontSize="small" /> : undefined}
      sx={{
        borderRadius: 10,
        textTransform: 'none',
        fontWeight: 600,
      }}
    >
      {isInterested ? 'In your interests' : 'Add to interests'}
    </Button>
  );
}
