'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { ArrowBack, Settings, Group, Warning } from '@mui/icons-material';
import Link from 'next/link';
import CustomTabs, { TabPersistenceConfig } from '@/components/core/tabs/CustomTabs';
import { ROUTES } from '@/lib/constants';
import { OrganizationMembership, OrganizationRole, User } from '@/data/graphql/types/graphql';
import {
  MembershipAction,
  PendingMembershipConfirmation,
  OrganizationFormData,
} from '@/components/organization/settings/types';
import GeneralSettingsTab from './settings/GeneralSettingsTab';
import TeamMembersTab from './settings/TeamMembersTab';
import DangerZoneTab from './settings/DangerZoneTab';
import MembershipConfirmationDialog from './settings/MembershipConfirmationDialog';
import useOrganizationSettingsData from '@/hooks/useOrganizationSettingsData';
import { logger } from '@/lib/utils';

interface OrganizationSettingsClientProps {
  slug: string;
}

export default function OrganizationSettingsClient({ slug }: OrganizationSettingsClientProps) {
  const {
    organization,
    orgLoading,
    memberships,
    membershipsLoading,
    session,
    saveOrganization,
    deleteOrganization,
    addOrganizationMembership,
    updateOrganizationMembershipRole,
    deleteOrganizationMembership,
    refetchMemberships,
    searchUsers,
    searchLoading,
    updateLoading,
    deleteLoading,
  } = useOrganizationSettingsData(slug);

  const [formData, setFormData] = useState<OrganizationFormData>({
    name: organization?.name ?? '',
    description: organization?.description ?? '',
    logo: organization?.logo ?? '',
    billingEmail: organization?.billingEmail ?? '',
    tags: organization?.tags?.join(', ') ?? '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [userOptions, setUserOptions] = useState<User[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const searchRequestRef = useRef(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [addMemberRole, setAddMemberRole] = useState<OrganizationRole>(OrganizationRole.Member);
  const [membershipAction, setMembershipAction] = useState<MembershipAction | null>(null);
  const [pendingMembershipConfirmation, setPendingMembershipConfirmation] =
    useState<PendingMembershipConfirmation | null>(null);

  const isMembershipActionInProgress = Boolean(membershipAction);

  useEffect(() => {
    if (!organization) return;
    setFormData({
      name: organization.name || '',
      description: organization.description || '',
      logo: organization.logo || '',
      billingEmail: organization.billingEmail || '',
      tags: organization.tags?.join(', ') || '',
    });
  }, [organization]);

  useEffect(() => {
    const searchTerm = searchInput.trim();
    if (searchTerm.length < 2) {
      searchRequestRef.current += 1;
      setUserOptions([]);
      return;
    }

    const requestId = (searchRequestRef.current += 1);
    const timeoutId = setTimeout(async () => {
      try {
        const users = await searchUsers(searchTerm);
        if (searchRequestRef.current !== requestId) {
          return;
        }
        setUserOptions(users);
      } catch (err) {
        if (searchRequestRef.current === requestId) {
          logger.error('Error searching users:', err);
          setUserOptions([]);
        }
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput, searchUsers]);

  const handleSave = useCallback(async () => {
    if (!organization) return;
    try {
      setSaveSuccess(false);
      setError(null);
      await saveOrganization(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update organization');
    }
  }, [formData, organization, saveOrganization]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteOrganization();
    } catch (err: any) {
      setError(err.message || 'Failed to delete organization');
      setDeleteDialogOpen(false);
    }
  }, [deleteOrganization]);

  const executeAddMember = useCallback(
    async (user: User, role: OrganizationRole) => {
      setMembershipAction({ type: 'add' });
      try {
        await addOrganizationMembership(user, role);
        setSelectedUser(null);
        setAddMemberRole(OrganizationRole.Member);
        await refetchMemberships();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (err: any) {
        setError(err.message || 'Failed to add member');
      } finally {
        setMembershipAction((prev) => (prev?.type === 'add' ? null : prev));
      }
    },
    [addOrganizationMembership, refetchMemberships],
  );

  const executeRoleChange = useCallback(
    async (membershipId: string, newRole: OrganizationRole) => {
      setMembershipAction({ type: 'update', membershipId });
      try {
        await updateOrganizationMembershipRole(membershipId, newRole);
        await refetchMemberships();
      } catch (err: any) {
        setError(err.message || 'Failed to update member role');
      } finally {
        setMembershipAction((prev) => (prev?.type === 'update' && prev.membershipId === membershipId ? null : prev));
      }
    },
    [updateOrganizationMembershipRole, refetchMemberships],
  );

  const executeRemoveMember = useCallback(
    async (membershipId: string) => {
      setMembershipAction({ type: 'remove', membershipId });
      try {
        await deleteOrganizationMembership(membershipId);
        await refetchMemberships();
      } catch (err: any) {
        setError(err.message || 'Failed to remove member');
      } finally {
        setMembershipAction((prev) => (prev?.type === 'remove' && prev.membershipId === membershipId ? null : prev));
      }
    },
    [deleteOrganizationMembership, refetchMemberships],
  );

  const promptAddMember = useCallback(() => {
    if (!selectedUser?.email || isMembershipActionInProgress) return;
    setPendingMembershipConfirmation({
      type: 'add',
      user: selectedUser,
      role: addMemberRole,
    });
  }, [selectedUser, addMemberRole, isMembershipActionInProgress]);

  const promptRoleChange = useCallback(
    (membership: OrganizationMembership, newRole: OrganizationRole) => {
      if (membership.role === newRole || isMembershipActionInProgress) return;
      setPendingMembershipConfirmation({
        type: 'role',
        membership,
        newRole,
      });
    },
    [isMembershipActionInProgress],
  );

  const promptRemoveMember = useCallback(
    (membership: OrganizationMembership) => {
      if (isMembershipActionInProgress) return;
      setPendingMembershipConfirmation({ type: 'remove', membership });
    },
    [isMembershipActionInProgress],
  );

  const confirmMembershipChange = useCallback(async () => {
    if (!pendingMembershipConfirmation) return;
    try {
      if (pendingMembershipConfirmation.type === 'add') {
        await executeAddMember(pendingMembershipConfirmation.user, pendingMembershipConfirmation.role);
      } else if (pendingMembershipConfirmation.type === 'role') {
        await executeRoleChange(
          pendingMembershipConfirmation.membership.membershipId,
          pendingMembershipConfirmation.newRole,
        );
      } else if (pendingMembershipConfirmation.type === 'remove') {
        await executeRemoveMember(pendingMembershipConfirmation.membership.membershipId);
      }
    } finally {
      setPendingMembershipConfirmation(null);
    }
  }, [pendingMembershipConfirmation, executeAddMember, executeRoleChange, executeRemoveMember]);

  const membershipActionLabelMemo = useMemo(() => {
    if (!membershipAction) return null;
    switch (membershipAction.type) {
      case 'add':
        return 'Inviting member...';
      case 'update':
        return 'Updating role...';
      case 'remove':
        return 'Removing member...';
    }
  }, [membershipAction]);

  const openDeleteDialog = useCallback(() => setDeleteDialogOpen(true), []);
  const closeDeleteDialog = useCallback(() => setDeleteDialogOpen(false), []);
  const clearError = useCallback(() => setError(null), []);
  const clearMembershipModal = useCallback(() => setPendingMembershipConfirmation(null), []);

  if (orgLoading || membershipsLoading) {
    return (
      <Container sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!organization) {
    return (
      <Container sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="h6" color="error">
          Organization not found
        </Typography>
      </Container>
    );
  }

  const userMembership = memberships.find((m) => m.userId === session?.user?.userId);
  const canManage =
    organization.ownerId === session?.user?.userId ||
    userMembership?.role === OrganizationRole.Owner ||
    userMembership?.role === OrganizationRole.Admin;

  if (!canManage) {
    return (
      <Container sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="h6" color="error">
          You don't have permission to manage this organization
        </Typography>
      </Container>
    );
  }

  const generalSettingsContent = (
    <GeneralSettingsTab
      formData={formData}
      setFormData={setFormData}
      logoFile={logoFile}
      logoPreview={logoPreview}
      setLogoFile={setLogoFile}
      setLogoPreview={setLogoPreview}
      handleSave={handleSave}
      updateLoading={updateLoading}
    />
  );

  const teamMembersContent = (
    <TeamMembersTab
      memberships={memberships}
      membershipsLoading={membershipsLoading}
      membershipAction={membershipAction}
      membershipActionLabel={membershipActionLabelMemo}
      isMembershipActionInProgress={isMembershipActionInProgress}
      userOptions={userOptions}
      searchInput={searchInput}
      setSearchInput={setSearchInput}
      selectedUser={selectedUser}
      setSelectedUser={setSelectedUser}
      searchLoading={searchLoading}
      addMemberRole={addMemberRole}
      setAddMemberRole={setAddMemberRole}
      promptAddMember={promptAddMember}
      promptRoleChange={promptRoleChange}
      promptRemoveMember={promptRemoveMember}
      currentUserId={session?.user?.userId}
    />
  );

  const dangerZoneContent = <DangerZoneTab onDeleteClick={openDeleteDialog} disabled={deleteLoading} />;

  const tabs = [
    {
      name: 'General Settings',
      content: generalSettingsContent,
      description: 'Update the profile details for this organization',
      icon: <Settings fontSize="small" />,
    },
    {
      name: 'Team Members',
      content: teamMembersContent,
      description: 'Manage roles and invites',
      icon: <Group fontSize="small" />,
    },
    {
      name: 'Danger Zone',
      content: dangerZoneContent,
      description: 'Permanently delete this organization',
      icon: <Warning fontSize="small" />,
    },
  ];

  const persistenceConfig: TabPersistenceConfig = {
    key: `organization-settings:${slug}`,
    userId: session?.user?.userId,
    storageType: 'localStorage',
    syncToBackend: false,
  };

  const tabsProps = {
    tabsTitle: 'Organization settings',
    tabs,
    persistence: persistenceConfig,
  };

  return (
    <Box>
      <Box sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', py: 3 }}>
        <Container>
          <Button
            component={Link}
            href={ROUTES.ACCOUNT.ORGANIZATIONS.ROOT}
            startIcon={<ArrowBack />}
            sx={{ mb: 2, fontWeight: 600, textTransform: 'none' }}
          >
            Back to Organizations
          </Button>
          <Typography variant="h4" fontWeight={800}>
            Manage {organization.name}
          </Typography>
        </Container>
      </Box>

      <Container sx={{ py: 4 }}>
        {error && (
          <Alert severity="error" onClose={clearError} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Organization updated successfully!
          </Alert>
        )}

        <CustomTabs tabsProps={tabsProps} />

        <MembershipConfirmationDialog
          open={Boolean(pendingMembershipConfirmation)}
          pendingMembershipConfirmation={pendingMembershipConfirmation}
          membershipAction={membershipAction}
          onClose={clearMembershipModal}
          onConfirm={confirmMembershipChange}
          isProcessing={isMembershipActionInProgress}
        />

        <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Delete Organization?</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete <strong>{organization.name}</strong>? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDeleteDialog} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              color="error"
              variant="contained"
              disabled={deleteLoading}
              sx={{ textTransform: 'none' }}
            >
              {deleteLoading ? 'Deleting...' : 'Delete Organization'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
