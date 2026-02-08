'use client';

import { Dispatch, SetStateAction } from 'react';

import {
  Autocomplete,
  Avatar,
  Button,
  Card,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Close, PersonAdd } from '@mui/icons-material';
import { OrganizationMembership, OrganizationRole, User } from '@/data/graphql/types/graphql';
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
  const availableUsers = userOptions.filter((user) => !memberships.some((m) => m.userId === user.userId));

  return (
    <Stack spacing={3}>
      <Typography variant="h6" fontWeight={700}>
        Team Members
      </Typography>

      <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
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

          <FormControl size="small" sx={{ minWidth: 150 }} disabled={isMembershipActionInProgress}>
            <InputLabel>Role</InputLabel>
            <Select
              value={addMemberRole}
              label="Role"
              onChange={(event) => setAddMemberRole(event.target.value as OrganizationRole)}
              disabled={isMembershipActionInProgress}
            >
              {ROLE_OPTIONS.filter((role) => role !== OrganizationRole.Owner).map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={<PersonAdd />}
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

      {membershipsLoading && <CircularProgress />}

      {!membershipsLoading && (
        <>
          {membershipActionLabel && (
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                {membershipActionLabel}
              </Typography>
            </Stack>
          )}

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Member</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Joined</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {memberships.map((membership) => {
                  const displayName = membership.username || membership.userId || 'Member';
                  const isCurrentUser = membership.userId === currentUserId;

                  return (
                    <TableRow key={membership.membershipId}>
                      <TableCell>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar sx={{ width: 32, height: 32 }}>{displayName.charAt(0).toUpperCase()}</Avatar>
                          <Typography variant="body2">{displayName}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {isCurrentUser ? (
                          <Chip label={membership.role} size="small" color="primary" />
                        ) : (
                          <Select
                            value={membership.role}
                            onChange={(event) => promptRoleChange(membership, event.target.value as OrganizationRole)}
                            disabled={isMembershipActionInProgress}
                            size="small"
                            sx={{ minWidth: 120 }}
                          >
                            {ROLE_OPTIONS.map((role) => (
                              <MenuItem key={role} value={role}>
                                {role}
                              </MenuItem>
                            ))}
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(membership.joinedAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {!isCurrentUser && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => promptRemoveMember(membership)}
                            disabled={isMembershipActionInProgress}
                          >
                            <Close />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Stack>
  );
}
