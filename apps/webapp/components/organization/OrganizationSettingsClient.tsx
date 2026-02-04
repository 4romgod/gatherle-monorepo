'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  TextField,
  Button,
  Stack,
  Alert,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import { ArrowBack, Save, Delete, PersonAdd, Close, CloudUpload } from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants';
import {
  GetOrganizationBySlugDocument,
  GetOrganizationMembershipsByOrgIdDocument,
  UpdateOrganizationDocument,
  DeleteOrganizationDocument,
  CreateOrganizationMembershipDocument,
  UpdateOrganizationMembershipDocument,
  DeleteOrganizationMembershipDocument,
  GetAllUsersDocument,
} from '@/data/graphql/query';
import { Organization, OrganizationMembership, OrganizationRole, User } from '@/data/graphql/types/graphql';
import { useSession } from 'next-auth/react';
import { getAuthHeader, logger } from '@/lib/utils';

interface OrganizationSettingsClientProps {
  slug: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function OrganizationSettingsClient({ slug }: OrganizationSettingsClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.user?.token;
  const [activeTab, setActiveTab] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [addMemberRole, setAddMemberRole] = useState<OrganizationRole>(OrganizationRole.Member);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [userOptions, setUserOptions] = useState<User[]>([]);

  const { data: orgData, loading: orgLoading } = useQuery<{ readOrganizationBySlug: Organization }>(
    GetOrganizationBySlugDocument,
    {
      variables: { slug },
      fetchPolicy: 'cache-and-network',
    },
  );

  const organization = orgData?.readOrganizationBySlug;

  const {
    data: membershipsData,
    loading: membershipsLoading,
    refetch: refetchMemberships,
  } = useQuery<{ readOrganizationMembershipsByOrgId: OrganizationMembership[] }>(
    GetOrganizationMembershipsByOrgIdDocument,
    {
      variables: { orgId: organization?.orgId },
      skip: !organization?.orgId,
      fetchPolicy: 'cache-and-network',
    },
  );

  const [searchUsers, { loading: searchLoading }] = useLazyQuery<{ readUsers: User[] }>(GetAllUsersDocument, {
    fetchPolicy: 'network-only',
  });

  // Debounced user search - only query when user types (min 2 chars)
  useEffect(() => {
    const searchTerm = searchInput.trim();
    if (searchTerm.length < 2) {
      setUserOptions([]);
      return;
    }

    // Debounce search by 300ms
    const timeoutId = setTimeout(async () => {
      try {
        const { data } = await searchUsers({
          variables: {
            options: {
              pagination: { limit: 50 },
              // TODO: For production, implement proper text search in the backend. Currently doing client-side filtering as a temporary solution
            },
          },
        });

        if (data?.readUsers) {
          // TODO: Filter users client-side (temporary - should be done in backend)
          const searchLower = searchTerm.toLowerCase();
          const filtered = data.readUsers.filter(
            (user) =>
              user.username?.toLowerCase().includes(searchLower) ||
              user.email?.toLowerCase().includes(searchLower) ||
              user.given_name?.toLowerCase().includes(searchLower) ||
              user.family_name?.toLowerCase().includes(searchLower),
          );
          setUserOptions(filtered);
        }
      } catch (err) {
        logger.error('Error searching users:', err);
        setUserOptions([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput, searchUsers]);

  const allUsers = userOptions;

  const memberships = membershipsData?.readOrganizationMembershipsByOrgId ?? [];

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo: '',
    billingEmail: '',
    tags: '',
  });

  // Update form when org loads or changes
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

  const [updateOrganization, { loading: updateLoading }] = useMutation(UpdateOrganizationDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [deleteOrganization, { loading: deleteLoading }] = useMutation(DeleteOrganizationDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [createMembership] = useMutation(CreateOrganizationMembershipDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [updateMembership] = useMutation(UpdateOrganizationMembershipDocument, {
    context: { headers: getAuthHeader(token) },
  });
  const [deleteMembership] = useMutation(DeleteOrganizationMembershipDocument, {
    context: { headers: getAuthHeader(token) },
  });

  const handleSave = async () => {
    if (!organization) return;

    try {
      setSaveSuccess(false);
      setError(null);

      await updateOrganization({
        variables: {
          input: {
            orgId: organization.orgId,
            name: formData.name,
            description: formData.description || null,
            logo: formData.logo || null,
            billingEmail: formData.billingEmail || null,
            tags: formData.tags
              ? formData.tags
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean)
              : [],
          },
        },
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update organization');
    }
  };

  const handleDelete = async () => {
    if (!organization) return;

    try {
      await deleteOrganization({
        variables: { orgId: organization.orgId },
      });
      router.push(ROUTES.ACCOUNT.ORGANIZATIONS.ROOT);
    } catch (err: any) {
      setError(err.message || 'Failed to delete organization');
      setDeleteDialogOpen(false);
    }
  };

  const handleAddMember = async () => {
    if (!organization?.orgId || !selectedUser?.email) return;

    try {
      await createMembership({
        variables: {
          input: {
            orgId: organization.orgId,
            userId: selectedUser.userId,
            role: addMemberRole,
          },
        },
      });
      setSelectedUser(null);
      setAddMemberRole(OrganizationRole.Member);
      refetchMemberships();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    }
  };

  const handleUpdateMemberRole = async (membershipId: string, newRole: OrganizationRole) => {
    try {
      await updateMembership({
        variables: {
          input: {
            membershipId,
            role: newRole,
          },
        },
      });
      await refetchMemberships();
    } catch (err: any) {
      setError(err.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    try {
      await deleteMembership({
        variables: {
          input: { membershipId },
        },
      });
      await refetchMemberships();
    } catch (err: any) {
      setError(err.message || 'Failed to remove member');
    }
  };

  if (orgLoading) {
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

  // Check if user has permission to manage org
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

  return (
    <Box>
      {/* Header */}
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
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Organization updated successfully!
          </Alert>
        )}

        <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              px: 2,
            }}
          >
            <Tab label="General Settings" sx={{ fontWeight: 600, textTransform: 'none' }} />
            <Tab label="Team Members" sx={{ fontWeight: 600, textTransform: 'none' }} />
            <Tab label="Danger Zone" sx={{ fontWeight: 600, textTransform: 'none', color: 'error.main' }} />
          </Tabs>

          {/* General Settings Tab */}
          <TabPanel value={activeTab} index={0}>
            <CardContent sx={{ p: 4 }}>
              <Stack spacing={3}>
                <TextField
                  label="Organization Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  fullWidth
                  required
                />

                <TextField
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  multiline
                  rows={4}
                  fullWidth
                />

                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Organization Logo
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Button component="label" variant="outlined" startIcon={<CloudUpload />}>
                      {logoFile ? logoFile.name : formData.logo ? 'Change Image' : 'Upload Image'}
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setLogoFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setLogoPreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </Button>
                    {(logoFile || logoPreview) && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          setLogoFile(null);
                          setLogoPreview(null);
                        }}
                        sx={{ color: 'text.secondary' }}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                  {(logoPreview || formData.logo) && (
                    <Box
                      sx={{
                        width: 120,
                        height: 120,
                        borderRadius: 2,
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                        mt: 1,
                      }}
                    >
                      <img
                        src={logoPreview || formData.logo}
                        alt="Organization logo preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </Box>
                  )}
                </Box>

                <TextField
                  label="Billing Email"
                  type="email"
                  value={formData.billingEmail}
                  onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
                  fullWidth
                />

                <TextField
                  label="Tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  fullWidth
                  helperText="Comma-separated tags for discovery (e.g., music, tech, sports)"
                />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSave}
                    disabled={updateLoading || !formData.name}
                    sx={{ fontWeight: 600, textTransform: 'none' }}
                  >
                    {updateLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </TabPanel>

          {/* Team Members Tab */}
          <TabPanel value={activeTab} index={1}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Team Members
              </Typography>

              {/* Add Member Form */}
              <Card variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Autocomplete
                    options={allUsers.filter((user) => !memberships.some((m) => m.userId === user.userId))}
                    value={selectedUser}
                    onChange={(_, newValue) => setSelectedUser(newValue)}
                    onInputChange={(_, newInputValue) => setSearchInput(newInputValue)}
                    getOptionLabel={(option) => option.username || option.email}
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
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props as any;
                      return (
                        <Box
                          component="li"
                          key={key}
                          {...otherProps}
                          sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                        >
                          <Avatar src={option.profile_picture || undefined} sx={{ width: 32, height: 32 }}>
                            {(option.username || option.email).charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {option.username || 'No username'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.email}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    }}
                    fullWidth
                    size="small"
                    isOptionEqualToValue={(option, value) => option.userId === value.userId}
                    filterOptions={(x) => x}
                  />
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Role</InputLabel>
                    <Select
                      value={addMemberRole}
                      onChange={(e) => setAddMemberRole(e.target.value as OrganizationRole)}
                    >
                      <MenuItem value={OrganizationRole.Member}>Member</MenuItem>
                      <MenuItem value={OrganizationRole.Moderator}>Moderator</MenuItem>
                      <MenuItem value={OrganizationRole.Host}>Host</MenuItem>
                      <MenuItem value={OrganizationRole.Admin}>Admin</MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    startIcon={<PersonAdd />}
                    onClick={handleAddMember}
                    sx={{ fontWeight: 600, textTransform: 'none', whiteSpace: 'nowrap' }}
                  >
                    Invite
                  </Button>
                </Stack>
              </Card>

              {/* Members Table */}
              {membershipsLoading ? (
                <CircularProgress />
              ) : (
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
                        return (
                          <TableRow key={membership.membershipId}>
                            <TableCell>
                              <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar sx={{ width: 32, height: 32 }}>{displayName.charAt(0).toUpperCase()}</Avatar>
                                <Typography variant="body2">{displayName}</Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              {membership.userId === session?.user?.userId ? (
                                <Chip label={membership.role} size="small" color="primary" />
                              ) : (
                                <Select
                                  value={membership.role}
                                  onChange={(e) =>
                                    handleUpdateMemberRole(membership.membershipId, e.target.value as OrganizationRole)
                                  }
                                  size="small"
                                  sx={{ minWidth: 120 }}
                                >
                                  <MenuItem value={OrganizationRole.Member}>Member</MenuItem>
                                  <MenuItem value={OrganizationRole.Moderator}>Moderator</MenuItem>
                                  <MenuItem value={OrganizationRole.Host}>Host</MenuItem>
                                  <MenuItem value={OrganizationRole.Admin}>Admin</MenuItem>
                                  <MenuItem value={OrganizationRole.Owner}>Owner</MenuItem>
                                </Select>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {new Date(membership.joinedAt).toLocaleDateString()}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              {membership.userId !== session?.user?.userId && (
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleRemoveMember(membership.membershipId)}
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
              )}
            </CardContent>
          </TabPanel>

          {/* Danger Zone Tab */}
          <TabPanel value={activeTab} index={2}>
            <CardContent sx={{ p: 4 }}>
              <Alert severity="error" sx={{ mb: 3 }}>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Danger Zone
                </Typography>
                <Typography variant="body2">
                  Deleting an organization is permanent and cannot be undone. All events and data associated with this
                  organization will be lost.
                </Typography>
              </Alert>

              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={() => setDeleteDialogOpen(true)}
                sx={{ fontWeight: 600, textTransform: 'none' }}
              >
                Delete Organization
              </Button>
            </CardContent>
          </TabPanel>
        </Card>
      </Container>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Organization?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{organization.name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: 'none' }}>
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
    </Box>
  );
}
