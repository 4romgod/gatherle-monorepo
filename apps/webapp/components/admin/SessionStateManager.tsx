'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Tooltip,
} from '@mui/material';
import { Delete, Refresh, Code, ContentCopy, CheckCircle } from '@mui/icons-material';
import { ReadAllSessionStatesDocument } from '@/data/graphql/query/SessionState/query';
import {
  ClearSessionStateDocument,
  ClearAllSessionStatesDocument,
} from '@/data/graphql/mutation/SessionState/mutation';
import { getAuthHeader } from '@/lib/utils/auth';
import ConfirmDialog from './ConfirmDialog';

interface SessionState {
  key: string;
  value: any;
  version?: number;
  updatedAt: string;
}

interface SessionStateManagerProps {
  token?: string;
  userId?: string;
}

export default function SessionStateManager({ token, userId }: SessionStateManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery(ReadAllSessionStatesDocument, {
    context: { headers: getAuthHeader(token) },
    skip: !token || !userId,
    fetchPolicy: 'network-only',
  });

  const [clearSessionState, { loading: clearLoading }] = useMutation(ClearSessionStateDocument, {
    context: { headers: getAuthHeader(token) },
    onCompleted: () => {
      refetch();
      setDeleteDialogOpen(false);
      setSelectedKey(null);
    },
  });

  const [clearAllSessionStates, { loading: clearAllLoading }] = useMutation(ClearAllSessionStatesDocument, {
    context: { headers: getAuthHeader(token) },
    onCompleted: () => {
      refetch();
      setClearAllDialogOpen(false);
    },
  });

  const sessionStates = data?.readAllSessionStates ?? [];
  const filteredStates = sessionStates.filter((state: SessionState) =>
    state.key.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleDelete = (key: string) => {
    setSelectedKey(key);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedKey) {
      clearSessionState({ variables: { key: selectedKey } });
    }
  };

  const handleClearAll = () => {
    setClearAllDialogOpen(true);
  };

  const confirmClearAll = () => {
    clearAllSessionStates();
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleRowExpansion = (key: string) => {
    setExpandedRow(expandedRow === key ? null : key);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatValue = (value: any): string => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  if (!token || !userId) {
    return <Alert severity="warning">You must be logged in to manage session states.</Alert>;
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" fontWeight={600}>
          Session State Manager
        </Typography>
        <Stack direction="row" spacing={2}>
          <Tooltip title="Refresh data">
            <IconButton onClick={() => refetch()} disabled={loading} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={handleClearAll}
            disabled={sessionStates.length === 0 || clearAllLoading}
            startIcon={clearAllLoading ? <CircularProgress size={16} /> : <Delete />}
          >
            Clear all
          </Button>
        </Stack>
      </Stack>

      <TextField
        fullWidth
        size="small"
        placeholder="Search by key..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ maxWidth: 400 }}
      />

      {error && <Alert severity="error">Failed to load session states: {error.message}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : filteredStates.length === 0 ? (
        <Card elevation={0}>
          <CardContent>
            <Typography color="text.secondary" textAlign="center">
              {searchQuery ? 'No session states match your search.' : 'No session states found.'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Card} elevation={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Key</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Updated</TableCell>
                <TableCell>Size</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStates.map((state: SessionState) => {
                const valueString = formatValue(state.value);
                const sizeInKB = (new Blob([valueString]).size / 1024).toFixed(2);
                const isExpanded = expandedRow === state.key;

                return (
                  <React.Fragment key={state.key}>
                    <TableRow hover>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" fontFamily="monospace">
                            {state.key}
                          </Typography>
                          <IconButton size="small" onClick={() => handleCopyKey(state.key)} sx={{ opacity: 0.6 }}>
                            {copiedKey === state.key ? (
                              <CheckCircle fontSize="small" color="success" />
                            ) : (
                              <ContentCopy fontSize="small" />
                            )}
                          </IconButton>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip label={`v${state.version ?? 1}`} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(state.updatedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {sizeInKB} KB
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title={isExpanded ? 'Hide value' : 'Show value'}>
                            <IconButton size="small" onClick={() => toggleRowExpansion(state.key)}>
                              <Code fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => handleDelete(state.key)} disabled={clearLoading}>
                              <Delete fontSize="small" color="error" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Box
                            component="pre"
                            sx={{
                              bgcolor: 'grey.100',
                              p: 2,
                              borderRadius: 1,
                              overflow: 'auto',
                              maxHeight: 400,
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                            }}
                          >
                            {valueString}
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete session state?"
        description={`This will permanently remove the session state for key: "${selectedKey}". This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSelectedKey(null);
        }}
        loading={clearLoading}
      />

      <ConfirmDialog
        open={clearAllDialogOpen}
        title="Clear all session states?"
        description="This will permanently remove ALL session states for this user. This action cannot be undone."
        confirmLabel="Clear all"
        onConfirm={confirmClearAll}
        onCancel={() => setClearAllDialogOpen(false)}
        loading={clearAllLoading}
      />
    </Stack>
  );
}
