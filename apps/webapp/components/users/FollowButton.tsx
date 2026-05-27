'use client';

import { Button, CircularProgress } from '@mui/material';
import { FiClock, FiSlash, FiUserCheck, FiUserPlus } from 'react-icons/fi';
import { useFollow, useFollowing, useBlockedUsers } from '@/hooks';
import { FollowTargetType, FollowApprovalStatus } from '@/data/graphql/types/graphql';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants';
import { useAppContext } from '@/hooks/useAppContext';
import { logger } from '@/lib/utils';
import NProgress from 'nprogress';
import { WEB_RADIUS } from '@/lib/constants/radius';

interface FollowButtonProps {
  targetId: string;
  targetType?: FollowTargetType;
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  variant?: 'default' | 'primary' | 'profile';
}

export default function FollowButton({
  targetId,
  targetType = FollowTargetType.User,
  size = 'medium',
  fullWidth = false,
  variant = 'default',
}: FollowButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { setToastProps } = useAppContext();
  const { follow, unfollow, isLoading: isMutating } = useFollow();
  const { following, loading: isLoadingFollowing } = useFollowing();
  const { blockedUsers } = useBlockedUsers();
  const [followStatus, setFollowStatus] = useState<FollowApprovalStatus | null>(null);

  const targetLabel = targetType === FollowTargetType.Organization ? 'organization' : 'user';
  const isLoading = isMutating || isLoadingFollowing;

  // Check if target user is blocked (only for User target type)
  const isBlocked =
    targetType === FollowTargetType.User && blockedUsers?.some((u: { userId: string }) => u.userId === targetId);

  useEffect(() => {
    const existingFollow = following.find((f) => f.targetType === targetType && f.targetId === targetId);
    setFollowStatus(existingFollow?.approvalStatus ?? null);
  }, [following, targetId, targetType]);

  const isFollowing = followStatus === FollowApprovalStatus.Accepted;
  const isPending = followStatus === FollowApprovalStatus.Pending;

  const handleFollowToggle = async () => {
    if (!session?.user?.token) {
      NProgress.start();
      router.push(ROUTES.AUTH.LOGIN);
      return;
    }

    try {
      // Only unfollow if Accepted or Pending, not if Rejected or null
      if (isFollowing || isPending) {
        await unfollow(targetType, targetId);
      } else {
        await follow(targetType, targetId);
      }
    } catch (error: any) {
      logger.error('Error toggling follow status:', error);

      // Extract error message from Apollo/GraphQL error
      // Apollo errors can have graphQLErrors array or networkError with result
      let errorMessage: string;
      if (error?.graphQLErrors?.length > 0) {
        errorMessage = error.graphQLErrors[0].message;
      } else if (error?.networkError?.result?.errors?.length > 0) {
        errorMessage = error.networkError.result.errors[0].message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else {
        errorMessage =
          isFollowing || isPending
            ? `Failed to unfollow ${targetLabel}. Please try again.`
            : `Failed to follow ${targetLabel}. Please try again.`;
      }

      setToastProps({
        open: true,
        message: errorMessage,
        severity: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 4000,
      });
    }
  };

  const getButtonIcon = () => {
    if (isLoading) return <CircularProgress size={16} />;
    if (isBlocked) return <FiSlash size={14} />;
    if (isFollowing) return <FiUserCheck size={14} />;
    if (isPending) return <FiClock size={14} />;
    return <FiUserPlus size={14} />;
  };

  const getButtonLabel = () => {
    if (isBlocked) return 'Blocked';
    if (isFollowing) return 'Following';
    if (isPending) return 'Requested';
    return 'Follow';
  };

  return (
    <Button
      onClick={handleFollowToggle}
      variant="contained"
      size={size}
      fullWidth={fullWidth}
      disabled={isLoading || isBlocked}
      startIcon={getButtonIcon()}
      sx={
        variant === 'primary'
          ? {
              borderRadius: 2,
              fontWeight: 600,
              textTransform: 'none',
              py: 1.5,
            }
          : variant === 'profile'
            ? {
                backgroundColor: 'action.disabledBackground',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: WEB_RADIUS.control,
                boxShadow: 'none',
                color: 'text.primary',
                fontSize: '0.8125rem',
                fontWeight: 600,
                minHeight: 38,
                px: 1.5,
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: 'action.disabledBackground',
                  borderColor: 'text.secondary',
                  boxShadow: 'none',
                },
              }
            : {
                borderRadius: 2,
                bgcolor: 'background.paper',
                color: 'text.primary',
                border: '1px solid',
                borderColor: (theme) => (theme.palette.mode === 'light' ? 'rgba(0,0,0,0.3)' : 'divider'),
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: 'background.default',
                  borderColor: 'text.secondary',
                  boxShadow: 'none',
                },
              }
      }
    >
      {getButtonLabel()}
    </Button>
  );
}
