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
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
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
      const filteredCategories = group.eventCategoryList.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );

      return { ...group, eventCategoryList: filteredCategories };
    })
    .filter(group => group.eventCategoryList.length > 0);

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: 'auto' }}>
      <Box
        sx={{
          display: { xs: 'block', md: 'flex' },
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 5 }}>
          My Interests
        </Typography>

        <Button
          variant="outlined"
          color="primary"
          onClick={() => {
            setTempInterests([...selectedInterests]);
            setSearchTerm('');
            setOpenModal(true);
          }}
        >
          Edit Interests
        </Button>
      </Box>

      {selectedInterests.length === 0 ? (
        <Typography variant="body2" color="textSecondary">
          You haven&apos;t selected any interests yet. Click &quot;Edit Interests&quot; to get started!
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {selectedInterests.map(interest => (
            <Chip
              key={interest.eventCategoryId}
              label={interest.name}
              onDelete={() => handleRemoveInterest(interest.eventCategoryId)}
              color="secondary"
              variant="outlined"
            />
          ))}
        </Box>
      )}

      <Typography variant="body2" color="textSecondary" sx={{ mt: 3 }}>
        Selecting interests helps us recommend events and groups that match your preferences.
      </Typography>

      <Box component="form" noValidate>
        <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth>
          <DialogTitle>Select Your Interests</DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2, mt: 1 }}>
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
              />
            </Box>

            <Typography variant="subtitle2" color="primary" sx={{ mt: 2, mb: 1 }}>
              Selected Interests: {tempInterests.length}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
              {tempInterests.map(interest => (
                <Chip
                  key={interest.eventCategoryId}
                  label={interest.name}
                  onDelete={() => handleInterestToggle(interest)}
                  color="secondary"
                />
              ))}
            </Box>

            <Grid container spacing={2}>
              {filteredCategoryGroups.map(categoryGroup => (
                <Grid size={{ xs: 12 }} key={categoryGroup.eventCategoryGroupId}>
                  <Typography variant="subtitle1" sx={{ mt: 1, mb: 1, fontWeight: 'bold' }}>
                    {categoryGroup.name}
                  </Typography>
                  <Grid container spacing={1}>
                    {categoryGroup.eventCategoryList.map(category => (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={category.eventCategoryId}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={tempInterests.some(item => item.eventCategoryId === category.eventCategoryId)}
                              onChange={() => handleInterestToggle(category)}
                              color="secondary"
                            />
                          }
                          label={category.name}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              ))}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenModal(false)} color="secondary">
              Cancel
            </Button>
            <Button onClick={handleSaveInterests} color="primary" variant="contained">
              Save Interests
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
