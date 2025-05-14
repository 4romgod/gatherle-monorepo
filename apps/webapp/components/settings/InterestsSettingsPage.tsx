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
  Paper,
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';
import { UserType } from '@/data/graphql/types/graphql';

// Predefined interest categories
const INTEREST_CATEGORIES = {
  Technology: [
    'Web Development', 'AI/Machine Learning', 'Cybersecurity',
    'Blockchain', 'Cloud Computing', 'Data Science'
  ],
  Sports: [
    'Football', 'Basketball', 'Tennis', 'Yoga', 'Running',
    'Cycling', 'Swimming', 'Rock Climbing'
  ],
  Arts: [
    'Photography', 'Painting', 'Music', 'Theater', 'Dance',
    'Creative Writing', 'Film'
  ],
  Outdoors: [
    'Hiking', 'Camping', 'Gardening', 'Fishing', 'Bird Watching',
    'Nature Photography'
  ],
  Food: [
    'Cooking', 'Baking', 'Wine Tasting', 'Vegan Cuisine',
    'International Cuisine', 'Craft Beer'
  ],
  Professional: [
    'Entrepreneurship', 'Marketing', 'Design', 'Finance',
    'Leadership', 'Networking'
  ]
};

export default function InterestsSettingsPage({ user, eventCategories }: { user: UserType; eventCategories: any }) {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    'Web Development', 'AI/Machine Learning', 'Cloud Computing'
  ]);
  const [openModal, setOpenModal] = useState(false);
  const [tempInterests, setTempInterests] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customInterest, setCustomInterest] = useState('');

  const handleInterestToggle = (interest: string) => {
    setTempInterests(prev =>
      prev.includes(interest)
        ? prev.filter(item => item !== interest)
        : [...prev, interest]
    );
  };

  const handleSaveInterests = () => {
    setSelectedInterests(tempInterests);
    setOpenModal(false);
    // TODO: Implement actual save logic (API call, etc.)
    console.log('Selected Interests:', tempInterests);
  };

  const handleRemoveInterest = (interest: string) => {
    setSelectedInterests(prev => prev.filter(item => item !== interest));
  };

  const handleAddCustomInterest = () => {
    if (customInterest.trim() && !tempInterests.includes(customInterest.trim())) {
      setTempInterests(prev => [...prev, customInterest.trim()]);
      setCustomInterest('');
    }
  };

  const filteredInterests = Object.entries(INTEREST_CATEGORIES).reduce<Record<string, string[]>>(
    (filtered, [category, interests]) => {
      const matchingInterests = interests.filter(interest =>
        interest.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (matchingInterests.length > 0) {
        filtered[category] = matchingInterests;
      }
      return filtered;
    },
    {}
  );

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: 'auto' }}>
      <Paper elevation={3} sx={{ padding: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight='bold' sx={{ mb: 5 }}>
            My Interests
          </Typography>          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              setTempInterests(selectedInterests);
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
            {selectedInterests.map((interest) => (
              <Chip
                key={interest}
                label={interest}
                onDelete={() => handleRemoveInterest(interest)}
                color="secondary"
                variant="outlined"
              />
            ))}
          </Box>
        )}

        <Typography variant="body2" color="textSecondary" sx={{ mt: 3 }}>
          Selecting interests helps us recommend events and groups that match your preferences.
        </Typography>

        <Dialog
          open={openModal}
          onClose={() => setOpenModal(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Select Your Interests</DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2, mt: 1 }}>
              <TextField
                fullWidth
                placeholder="Search interests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
                variant="outlined"
              />
            </Box>

            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              mb: 2,
              gap: 1
            }}>
              <TextField
                placeholder="Add custom interest..."
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                variant="outlined"
                size="small"
                fullWidth
              />
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleAddCustomInterest}
                disabled={!customInterest.trim()}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Add
              </Button>
            </Box>

            <Typography variant="subtitle2" color="primary" sx={{ mt: 2, mb: 1 }}>
              Selected Interests: {tempInterests.length}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
              {tempInterests.map((interest) => (
                <Chip
                  key={interest}
                  label={interest}
                  onDelete={() => handleInterestToggle(interest)}
                  color="secondary"
                />
              ))}
            </Box>

            <Grid container spacing={2}>
              {Object.entries(filteredInterests).map(([category, interests]) => (
                <Grid size={{xs: 12}} key={category}>
                  <Typography variant="subtitle1" sx={{ mt: 1, mb: 1, fontWeight: 'bold' }}>
                    {category}
                  </Typography>
                  <Grid container spacing={1}>
                    {interests.map((interest) => (
                      <Grid size={{xs: 12, sm: 6, md: 4}} key={interest}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={tempInterests.includes(interest)}
                              onChange={() => handleInterestToggle(interest)}
                              color="secondary"
                            />
                          }
                          label={interest}
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
            <Button
              onClick={handleSaveInterests}
              color="primary"
              variant="contained"
            >
              Save Interests
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
};
