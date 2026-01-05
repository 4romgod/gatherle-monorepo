'use client';

import React, { useState } from 'react';
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
  Divider,
  Paper,
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, Save as SaveIcon, Close as CloseIcon } from '@mui/icons-material';
import { EventCategoryGroup, EventCategory, User } from '@/data/graphql/types/graphql';

export default function InterestsSettingsPage({
  user,
  eventCategoryGroups,
}: {
  user: User;
  eventCategoryGroups: EventCategoryGroup[];
}) {
  const [selectedInterests, setSelectedInterests] = useState<EventCategory[]>(user.interests ? user.interests : []);
  const [tempInterests, setTempInterests] = useState<EventCategory[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
    setSelectedInterests(tempInterests);
    setOpenModal(false);
    // TODO: Implement actual save logic (API call, etc.)
    console.log('Selected Interests:', tempInterests);
  };

  const handleRemoveInterest = (interestId: string) => {
    setSelectedInterests(prev => prev.filter(item => item.eventCategoryId !== interestId));
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

  return (
    <Box>
      <Stack spacing={4}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              My Interests
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select interests to get personalized event recommendations
            </Typography>
          </Box>

          <Button
            startIcon={<AddIcon />}
            variant="contained"
            color="secondary"
            onClick={() => {
              setTempInterests([...selectedInterests]);
              setSearchTerm('');
              setOpenModal(true);
            }}
            sx={{ borderRadius: 2 }}
          >
            Edit Interests
          </Button>
        </Stack>

        {/* Selected Interests Display */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
          }}
        >
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Selected Interests ({selectedInterests.length})
          </Typography>
          <Divider sx={{ mb: 3 }} />

          {selectedInterests.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                You haven&apos;t selected any interests yet
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Click &quot;Edit Interests&quot; to get started and receive personalized recommendations!
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {selectedInterests.map(interest => (
                <Chip
                  key={interest.eventCategoryId}
                  label={interest.name}
                  onDelete={() => handleRemoveInterest(interest.eventCategoryId)}
                  color="secondary"
                  variant="filled"
                  sx={{ borderRadius: 2 }}
                />
              ))}
            </Box>
          )}
        </Paper>
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
          },
        }}
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700}>
              Select Your Interests
            </Typography>
            <Button size="small" onClick={() => setOpenModal(false)} sx={{ minWidth: 'auto' }}>
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
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              variant="outlined"
              color="secondary"
              sx={{ borderRadius: 2 }}
            />
          </Box>

          {/* Selected Count & Chips */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              bgcolor: 'secondary.main',
              color: 'secondary.contrastText',
              borderRadius: 2,
            }}
          >
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Selected: {tempInterests.length} interests
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
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
                    }}
                  />
                ))
              ) : (
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  No interests selected yet
                </Typography>
              )}
            </Box>
          </Paper>

          {/* Category Groups */}
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {filteredCategoryGroups.map(categoryGroup => (
              <Box key={categoryGroup.eventCategoryGroupId} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 700, color: 'primary.main' }}>
                  {categoryGroup.name}
                </Typography>
                <Grid container spacing={1}>
                  {categoryGroup.eventCategories.map(category => (
                    <Grid size={{xs: 12, sm: 6}} key={category.eventCategoryId}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1,
                          border: '1px solid',
                          borderColor: tempInterests.some(item => item.eventCategoryId === category.eventCategoryId)
                            ? 'secondary.main'
                            : 'divider',
                          borderRadius: 2,
                          bgcolor: tempInterests.some(item => item.eventCategoryId === category.eventCategoryId)
                            ? 'secondary.light'
                            : 'transparent',
                          transition: 'all 0.2s',
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
                          label={<Typography variant="body2">{category.name}</Typography>}
                          sx={{ m: 0, width: '100%' }}
                        />
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={() => setOpenModal(false)} variant="outlined" sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            startIcon={<SaveIcon />}
            onClick={handleSaveInterests}
            color="secondary"
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Save Interests
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
