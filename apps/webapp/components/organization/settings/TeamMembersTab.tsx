'use client';

import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import Link from 'next/link';
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CalendarToday, PersonAdd, ShieldOutlined } from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { OrganizationMembership, OrganizationRole, User } from '@/data/graphql/types/graphql';
import { ROUTES } from '@/lib/constants';
import UserBoxSkeleton from '@/components/users/UserBoxSkeleton';
import { MembershipAction } from './types';

interface TeamMembersTabProps {
  memberships: OrganizationMembership[];
  membershipsLoading: boolean;
  membershipAction: MembershipAction | null;
  membershipActionLabel: string | null;
  isMembershipActionInProgress: boolean;
  userOptions: User[];
  searchInput: string;
  setSearchInput: Dispatch<SetStateAction<string>>;
  selectedUser: User | null;
  setSelectedUser: Dispatch<SetStateAction<User | null>>;
  searchLoading: boolean;
  addMemberRole: OrganizationRole;
  setAddMemberRole: Dispatch<SetStateAction<OrganizationRole>>;
  promptAddMember: () => void;
  promptRoleChange: (membership: OrganizationMembership, newRole: OrganizationRole) => void;
  promptRemoveMember: (membership: OrganizationMembership) => void;
  currentUserId?: string;
}

const ROLE_OPTIONS = [
  OrganizationRole.Member,
  OrganizationRole.Moderator,
  OrganizationRole.Host,
  OrganizationRole.Admin,
  OrganizationRole.Owner,
];

const MANAGEABLE_ROLE_OPTIONS = ROLE_OPTIONS.filter((role) => role !== OrganizationRole.Owner);

const ROLE_PRIORITY: Record<OrganizationRole, number> = {
  [OrganizationRole.Owner]: 0,
  [OrganizationRole.Admin]: 1,
  [OrganizationRole.Host]: 2,
  [OrganizationRole.Moderator]: 3,
  [OrganizationRole.Member]: 4,
};

function formatRoleLabel(role: OrganizationRole) {
  return role.replace(/[_-]+/g, ' ');
}

export default function TeamMembersTab({
  memberships,
  membershipsLoading,
  membershipAction,
  membershipActionLabel,
  isMembershipActionInProgress,
  userOptions,
  searchInput,
  setSearchInput,
  selectedUser,
  setSelectedUser,
  searchLoading,
  addMemberRole,
  setAddMemberRole,
  promptAddMember,
  promptRoleChange,
  promptRemoveMember,
  currentUserId,
}: TeamMembersTabProps) {
  const theme = useTheme();
  const [expandedMembershipId, setExpandedMembershipId] = useState<string | null>(null);

  const availableUsers = useMemo(
    () => userOptions.filter((user) => !memberships.some((membership) => membership.userId === user.userId)),
    [memberships, userOptions],
  );

  const sortedMemberships = useMemo(
    () =>
      [...memberships].sort((left, right) => {
        const roleDiff = ROLE_PRIORITY[left.role] - ROLE_PRIORITY[right.role];
        if (roleDiff !== 0) {
          return roleDiff;
        }
        return (left.username ?? left.userId).localeCompare(right.username ?? right.userId);
      }),
    [memberships],
  );

  return (
    <Stack spacing={3}>
      <Typography variant="h6" fontWeight={700}>
        Team Members
      </Typography>

      <Card
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Autocomplete
            options={availableUsers}
            value={selectedUser}
            onChange={(_, value) => setSelectedUser(value)}
            onInputChange={(_, value) => setSearchInput(value)}
            getOptionLabel={(option) => option.username || option.email || 'Unknown'}
            loading={searchLoading}
            noOptionsText={
              searchInput.length < 2
                ? 'Type at least 2 characters to search'
                : searchLoading
                  ? 'Searching...'
                  : 'No users found'
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search user"
                placeholder="Type to search..."
                size="small"
                helperText="Search by username, email, or name (min 2 characters)"
              />
            )}
            isOptionEqualToValue={(option, value) => option.userId === value.userId}
            filterOptions={(options) => options}
            disabled={isMembershipActionInProgress}
            fullWidth
          />

          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }} disabled={isMembershipActionInProgress}>
            <InputLabel>Role</InputLabel>
            <Select
              value={addMemberRole}
              label="Role"
              onChange={(event) => setAddMemberRole(event.target.value as OrganizationRole)}
              disabled={isMembershipActionInProgress}
            >
              {MANAGEABLE_ROLE_OPTIONS.map((role) => (
                <MenuItem key={role} value={role}>
                  {formatRoleLabel(role)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={
              membershipAction?.type === 'add' ? <CircularProgress size={16} color="inherit" /> : <PersonAdd />
            }
            onClick={() => {
              if (!selectedUser?.userId) {
                return;
              }
              promptAddMember();
            }}
            disabled={!selectedUser?.userId || isMembershipActionInProgress}
            sx={{ fontWeight: 600, textTransform: 'none', whiteSpace: 'nowrap' }}
          >
            {membershipAction?.type === 'add' ? 'Inviting...' : 'Invite'}
          </Button>
        </Stack>
      </Card>

      {membershipsLoading ? (
        <Grid container spacing={3}>
          {Array.from({ length: 3 }).map((_, index) => (
            <UserBoxSkeleton key={`team-member-skeleton-${index}`} />
          ))}
        </Grid>
      ) : (
        <Box sx={{ position: 'relative' }}>
          {isMembershipActionInProgress && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                bgcolor: alpha(theme.palette.background.paper, 0.9),
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 3,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={24} />
                {membershipActionLabel && (
                  <Typography variant="body2" color="text.secondary">
                    {membershipActionLabel}
                  </Typography>
                )}
              </Stack>
            </Box>
          )}

          {sortedMemberships.length > 0 ? (
            <Grid container spacing={3}>
              {sortedMemberships.map((membership) => {
                const displayName = membership.username ? `@${membership.username}` : membership.userId;
                const initialsSource = membership.username || membership.userId || 'M';
                const joinedLabel = new Date(membership.joinedAt).toLocaleDateString();
                const isCurrentUser = membership.userId === currentUserId;
                const isOwnerMembership = membership.role === OrganizationRole.Owner;
                const canChangeRole = !isCurrentUser && !isOwnerMembership;
                const canLeaveMembership = isCurrentUser && !isOwnerMembership;
                const isExpanded = expandedMembershipId === membership.membershipId;
                const profileHref = membership.username ? ROUTES.USERS.USER(membership.username) : null;

                return (
                  <Grid key={membership.membershipId} size={{ xs: 12, sm: 6, lg: 4 }}>
                    <Card
                      elevation={0}
                      sx={{
                        height: '100%',
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        overflow: 'hidden',
                      }}
                    >
                      <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar
                            sx={{
                              width: 56,
                              height: 56,
                              border: '2px solid',
                              borderColor: 'divider',
                              bgcolor: alpha(theme.palette.primary.main, 0.08),
                              color: 'text.primary',
                            }}
                          >
                            {initialsSource.charAt(0).toUpperCase()}
                          </Avatar>

                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            {profileHref ? (
                              <Typography
                                component={Link}
                                href={profileHref}
                                variant="subtitle1"
                                fontWeight={700}
                                lineHeight={1.2}
                                noWrap
                                color="text.primary"
                                sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
                              >
                                {displayName}
                              </Typography>
                            ) : (
                              <Typography
                                variant="subtitle1"
                                fontWeight={700}
                                lineHeight={1.2}
                                noWrap
                                color="text.primary"
                              >
                                {displayName}
                              </Typography>
                            )}

                            <Typography variant="caption" color="text.secondary">
                              {membership.username ? 'Organization team member' : 'Team member'}
                            </Typography>
                          </Box>
                        </Stack>

                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                          <Chip
                            label={formatRoleLabel(membership.role)}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              bgcolor: alpha(theme.palette.primary.main, 0.08),
                              color: 'text.primary',
                              border: 'none',
                            }}
                          />
                          <Chip
                            icon={<CalendarToday sx={{ fontSize: 14 }} />}
                            label={`Joined ${joinedLabel}`}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              bgcolor: alpha(theme.palette.text.primary, 0.06),
                              color: 'text.secondary',
                              border: 'none',
                            }}
                          />
                          {isCurrentUser ? (
                            <Chip
                              label="You"
                              size="small"
                              sx={{
                                fontWeight: 700,
                                bgcolor: alpha(theme.palette.success.main, 0.12),
                                color: 'success.dark',
                                border: 'none',
                              }}
                            />
                          ) : null}
                        </Stack>

                        {isOwnerMembership ? (
                          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 2 }}>
                            <ShieldOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              Owner access is managed separately from team roles.
                            </Typography>
                          </Stack>
                        ) : isCurrentUser ? (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
                            Your role is view-only here. Another organization admin must change it, but you can leave
                            the organization yourself.
                          </Typography>
                        ) : null}

                        {canChangeRole ? (
                          <>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 'auto', pt: 3 }}>
                              <Button
                                variant="outlined"
                                fullWidth
                                onClick={() =>
                                  setExpandedMembershipId((current) =>
                                    current === membership.membershipId ? null : membership.membershipId,
                                  )
                                }
                                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                              >
                                {isExpanded ? 'Hide role options' : 'Change role'}
                              </Button>
                              <Button
                                variant="text"
                                color="error"
                                fullWidth
                                onClick={() => promptRemoveMember(membership)}
                                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                              >
                                Remove
                              </Button>
                            </Stack>

                            {isExpanded ? (
                              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                                {MANAGEABLE_ROLE_OPTIONS.map((role) => (
                                  <Chip
                                    key={`${membership.membershipId}-${role}`}
                                    label={formatRoleLabel(role)}
                                    clickable
                                    color={membership.role === role ? 'primary' : 'default'}
                                    onClick={() => promptRoleChange(membership, role)}
                                    sx={{ fontWeight: 600 }}
                                  />
                                ))}
                              </Stack>
                            ) : null}
                          </>
                        ) : canLeaveMembership ? (
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 'auto', pt: 3 }}>
                            <Button
                              variant="text"
                              color="error"
                              fullWidth
                              onClick={() => promptRemoveMember(membership)}
                              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                            >
                              Leave organization
                            </Button>
                          </Stack>
                        ) : null}
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            <Card
              elevation={0}
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                This organization does not have any team members yet.
              </Typography>
            </Card>
          )}
        </Box>
      )}
    </Stack>
  );
}
