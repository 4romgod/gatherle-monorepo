'use client';

import { Button, CircularProgress } from '@mui/material';
import { PersonAdd, PersonRemove, HourglassEmpty } from '@mui/icons-material';
import { useFollow, useFollowing } from '@/hooks';
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
  const [followStatus, setFollowStatus] = useState<FollowApprovalStatus | null>(null);

  const targetLabel = targetType === FollowTargetType.Organization ? 'organization' : 'user';
  const isLoading = isMutating || isLoadingFollowing;

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
      if (followStatus) {
        await unfollow(targetType, targetId);
      } else {
        await follow(targetType, targetId);
      }
    } catch (error) {
      logger.error('Error toggling follow status:', error);
      setToastProps({
        open: true,
        message: followStatus
          ? `Failed to unfollow ${targetLabel}. Please try again.`
          : `Failed to follow ${targetLabel}. Please try again.`,
        severity: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 4000,
      });
    }
  };

  const getButtonIcon = () => {
    if (isLoading) return <CircularProgress size={16} />;
    if (isFollowing) return <PersonRemove />;
    if (isPending) return <HourglassEmpty />;
    return <PersonAdd />;
  };

  const getButtonLabel = () => {
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
      disabled={isLoading}
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
