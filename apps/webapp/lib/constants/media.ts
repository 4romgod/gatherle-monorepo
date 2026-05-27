export type WebMediaCropPresetKey = 'eventCover' | 'venueFeatured' | 'avatar' | 'organizationLogo' | 'momentPortrait';

export type WebMediaCropPreset = {
  aspect: number;
  aspectLabel: string;
  cropLabel: string;
  helperText: string;
  outputHeight: number;
  outputWidth: number;
};

export const WEB_MEDIA_CROP_PRESETS: Record<WebMediaCropPresetKey, WebMediaCropPreset> = {
  avatar: {
    aspect: 1,
    aspectLabel: '1:1',
    cropLabel: 'Square avatar',
    helperText: 'This will be shown as a square avatar across Gatherle.',
    outputHeight: 1080,
    outputWidth: 1080,
  },
  eventCover: {
    aspect: 16 / 9,
    aspectLabel: '16:9',
    cropLabel: 'Event cover',
    helperText: 'This will be shown as a 16:9 cover on event cards and event details.',
    outputHeight: 900,
    outputWidth: 1600,
  },
  momentPortrait: {
    aspect: 9 / 16,
    aspectLabel: '9:16',
    cropLabel: 'Moment frame',
    helperText: 'This will be shown in the vertical moments viewer.',
    outputHeight: 1920,
    outputWidth: 1080,
  },
  organizationLogo: {
    aspect: 1,
    aspectLabel: '1:1',
    cropLabel: 'Organization logo',
    helperText: 'This will be shown as a square organization mark across Gatherle.',
    outputHeight: 1080,
    outputWidth: 1080,
  },
  venueFeatured: {
    aspect: 16 / 9,
    aspectLabel: '16:9',
    cropLabel: 'Venue cover',
    helperText: 'This will be shown as a 16:9 venue cover where venue media appears.',
    outputHeight: 900,
    outputWidth: 1600,
  },
};
