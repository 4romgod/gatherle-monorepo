'use client';

import { Button, CircularProgress } from '@mui/material';
import { PersonAdd, PersonRemove, HourglassEmpty, Block } from '@mui/icons-material';
import { useFollow, useFollowing, useBlockedUsers } from '@/hooks';
import { FollowTargetType, FollowApprovalStatus } from '@/data/graphql/types/graphql';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants';
import { useAppContext } from '@/hooks/useAppContext';
import { logger } from '@/lib/utils';
import NProgress from 'nprogress';

interface FollowButtonProps {
  targetId: string;
  targetType?: FollowTargetType;
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  variant?: 'default' | 'primary';
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
  const isBlocked = targetType === FollowTargetType.User && blockedUsers?.some((u: { userId: string }) => u.userId === targetId);

  useEffect(() => {
    const existingFollow = following.find(f => f.targetType === targetType && f.targetId === targetId);
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
        errorMessage = (isFollowing || isPending)
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
    if (isBlocked) return <Block />;
    if (isFollowing) return <PersonRemove />;
    if (isPending) return <HourglassEmpty />;
    return <PersonAdd />;
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
          : {
              borderRadius: 2,
              bgcolor: 'background.paper',
              color: 'text.primary',
              boxShadow: 2,
              '&:hover': {
                bgcolor: 'background.default',
                boxShadow: 4,
              },
            }
      }
    >
      {getButtonLabel()}
    </Button>
  );
}
