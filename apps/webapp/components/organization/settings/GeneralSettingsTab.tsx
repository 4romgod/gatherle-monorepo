'use client';

import { Dispatch, SetStateAction } from 'react';
import { Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import { CloudUpload, Close, Save } from '@mui/icons-material';
import { OrganizationFormData } from './types';

interface GeneralSettingsTabProps {
  formData: OrganizationFormData;
  setFormData: Dispatch<SetStateAction<OrganizationFormData>>;
  logoFile: File | null;
  logoPreview: string | null;
  setLogoFile: (file: File | null) => void;
  setLogoPreview: (preview: string | null) => void;
  handleSave: () => Promise<void>;
  updateLoading: boolean;
}

export default function GeneralSettingsTab({
  formData,
  setFormData,
  logoFile,
  logoPreview,
  setLogoFile,
  setLogoPreview,
  handleSave,
  updateLoading,
}: GeneralSettingsTabProps) {
  const previewSrc = logoPreview || formData.logo || undefined;

  const handleLogoChange = (file: File | null) => {
    if (!file) {
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h6" fontWeight={700}>
          General Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Keep your organization profile up to date.
        </Typography>
      </Stack>

      <TextField
        label="Organization Name"
        value={formData.name}
        onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
        fullWidth
        required
      />

      <TextField
        label="Description"
        value={formData.description}
        onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
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
              onChange={(event) => handleLogoChange(event.target.files?.[0] ?? null)}
            />
          </Button>
          {previewSrc && (
            <IconButton size="small" onClick={() => handleLogoChange(null)} sx={{ color: 'text.secondary' }}>
              <Close fontSize="small" />
            </IconButton>
          )}
        </Box>
        {previewSrc && (
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
              src={previewSrc}
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
        onChange={(event) => setFormData((prev) => ({ ...prev, billingEmail: event.target.value }))}
        fullWidth
      />

      <TextField
        label="Tags"
        value={formData.tags}
        onChange={(event) => setFormData((prev) => ({ ...prev, tags: event.target.value }))}
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
  );
}
