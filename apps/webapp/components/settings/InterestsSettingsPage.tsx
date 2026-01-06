'use client';

import { useState, useActionState, useTransition, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  TextField,
  InputAdornment,
  Stack,
  Alert,
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, Save as SaveIcon, Close as CloseIcon } from '@mui/icons-material';
import { EventCategoryGroup, EventCategory, User } from '@/data/graphql/types/graphql';
import { updateUserProfileAction } from '@/data/actions/server/user';
import { signIn, useSession } from 'next-auth/react';
import EventCategoryChip from '@/components/events/category/chip';

type InterestsSettingsPageProps = {
  user: User;
  eventCategoryGroups: EventCategoryGroup[];
}
export default function InterestsSettingsPage({ user, eventCategoryGroups }: InterestsSettingsPageProps) {
  const [selectedInterests, setSelectedInterests] = useState<EventCategory[]>(user.interests ? user.interests : []);
  const [tempInterests, setTempInterests] = useState<EventCategory[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useActionState(updateUserProfileAction, {
    apiError: null,
    zodErrors: null,
  });

  // Sync selectedInterests with session data when it updates
  useEffect(() => {
    if (session?.user?.interests) {
      setSelectedInterests(session.user.interests);
    }
  }, [session?.user?.interests]);

  const handleInterestToggle = (eventCategory: EventCategory) => {
    setTempInterests(prev => {
      const exists = prev.some(item => item.eventCategoryId === eventCategory.eventCategoryId);
      if (exists) {
        return prev.filter(item => item.eventCategoryId !== eventCategory.eventCategoryId);
      } else {
        return [...prev, eventCategory];
      }
    });
  };

  const handleSaveInterests = () => {
    const formData = new FormData();
    formData.append('userId', user.userId);
    formData.append('interests', JSON.stringify(tempInterests.map(i => i.eventCategoryId)));
    
    startTransition(() => {
      formAction(formData);
    });
  };

  // Filter event categories based on search term
  const filteredCategoryGroups = eventCategoryGroups
    .map(group => {
      const filteredCategories = group.eventCategories.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );

      return { ...group, eventCategories: filteredCategories };
    })
    .filter(group => group.eventCategories.length > 0);

  // Update local state and session when action succeeds
  useEffect(() => {
    if (state.data && !state.apiError && session?.user?.token) {
      const updatedUser = state.data as User;

      const refreshSession = async () => {
        await signIn('refresh-session', {
          userData: JSON.stringify(updatedUser),
          token: session.user.token,
          redirect: false,
        });
        setOpenModal(false);
      };

      refreshSession();
    }
  }, [state.data, state.apiError]);

  const hasSuccess = !!state.data && !state.apiError;

  return (
    <Box>
      {state.apiError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {state.apiError}
        </Alert>
      )}
      
      {hasSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Your interests have been updated successfully!
        </Alert>
      )}
      
      <Stack spacing={4}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={{ xs: 2, sm: 0 }} sx={{ mb: { xs: 3, sm: 5 } }}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: 'text.primary', fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
              My Interests
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
              Select interests to get personalized event recommendations
            </Typography>
          </Box>

          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            color="primary"
            onClick={() => {
              setTempInterests([...selectedInterests]);
              setSearchTerm('');
              setOpenModal(true);
            }}
            size="large"
            sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', width: { xs: '100%', sm: 'auto' } }}
          >
            Edit Interests
          </Button>
        </Stack>

        {/* Selected Interests Display */}
        <Box>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Your Interests ({selectedInterests.length})
          </Typography>

          {selectedInterests.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <AddIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" fontWeight={600} gutterBottom>
                No interests selected yet
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Click "Edit Interests" to get started and receive personalized recommendations!
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {selectedInterests.map(interest => (
                <Box key={interest.eventCategoryId} sx={{ position: 'relative', display: 'inline-flex' }}>
                  <EventCategoryChip category={interest} />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Stack>

      {/* Interest Selection Modal */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Select Your Interests
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Choose categories you're interested in
              </Typography>
            </Box>
            <Button 
              size="small" 
              onClick={() => setOpenModal(false)} 
              sx={{ minWidth: 'auto', color: 'text.secondary' }}
            >
              <CloseIcon />
            </Button>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {/* Search Bar */}
          <Box sx={{ mb: 3, mt: 1 }}>
            <TextField
              fullWidth
              placeholder="Search interests..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                },
              }}
              variant="outlined"
              color="secondary"
              sx={{ borderRadius: 2 }}
            />
          </Box>

          {/* Selected Count & Chips */}
          <Box
            sx={{
              p: 2,
              mb: 2,
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'secondary.dark' : 'secondary.lighter',
              borderRadius: 2,
            }}
          >
            <Typography variant="subtitle1" fontWeight={600} gutterBottom color="secondary.main">
              {tempInterests.length} {tempInterests.length === 1 ? 'interest' : 'interests'} selected
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
              {tempInterests.length > 0 ? (
                tempInterests.map(interest => (
                  <Chip
                    key={interest.eventCategoryId}
                    label={interest.name}
                    onDelete={() => handleInterestToggle(interest)}
                    size="small"
                    sx={{
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                      borderRadius: 1.5,
                      fontWeight: 500,
                    }}
                  />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No interests selected yet. Start by checking some categories below.
                </Typography>
              )}
            </Box>
          </Box>

          {/* Category Groups */}
          <Box sx={{ maxHeight: 400, overflow: 'auto', pr: 1 }}>
            {filteredCategoryGroups.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                <Typography variant="body1" color="text.secondary">
                  No interests found matching "{searchTerm}"
                </Typography>
              </Box>
            ) : (
              filteredCategoryGroups.map(categoryGroup => (
                <Box key={categoryGroup.eventCategoryGroupId} sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700, color: 'primary.main' }}>
                    {categoryGroup.name}
                  </Typography>
                  <Grid container spacing={{ xs: 1, sm: 1.5 }}>
                    {categoryGroup.eventCategories.map(category => (
                      <Grid size={{ xs: 12, sm: 6 }} key={category.eventCategoryId}>
                        <Box
                          sx={{
                            p: 1.5,
                            border: '2px solid',
                            borderColor: tempInterests.some(item => item.eventCategoryId === category.eventCategoryId)
                              ? 'secondary.main'
                              : 'divider',
                            borderRadius: 2,
                            bgcolor: tempInterests.some(item => item.eventCategoryId === category.eventCategoryId)
                              ? 'secondary.lighter'
                              : 'transparent',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              borderColor: 'secondary.main',
                              bgcolor: 'action.hover',
                            },
                          }}
                        >
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={tempInterests.some(item => item.eventCategoryId === category.eventCategoryId)}
                                onChange={() => handleInterestToggle(category)}
                                color="secondary"
                              />
                            }
                            label={<Typography variant="body2" fontWeight={500}>{category.name}</Typography>}
                            sx={{ m: 0, width: '100%', userSelect: 'none' }}
                          />
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ))
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2, gap: 1 }}>
          <Button 
            onClick={() => setOpenModal(false)} 
            variant="outlined" 
            size="large"
            sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            startIcon={<SaveIcon />}
            onClick={handleSaveInterests}
            color="secondary"
            variant="contained"
            size="large"
            disabled={isPending}
            sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
          >
            {isPending ? 'Saving...' : `Save ${tempInterests.length} ${tempInterests.length === 1 ? 'Interest' : 'Interests'}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
