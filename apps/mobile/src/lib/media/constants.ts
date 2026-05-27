export const MOBILE_MEDIA_ASPECT_RATIOS = {
  avatar: 1,
  eventCover: 16 / 9,
  momentPortrait: 9 / 16,
  organizationLogo: 1,
  venueFeatured: 16 / 9,
} as const;

export const MOBILE_MEDIA_PICKER_ASPECTS = {
  avatar: [1, 1] as [number, number],
  eventCover: [16, 9] as [number, number],
  momentPortrait: [9, 16] as [number, number],
  organizationLogo: [1, 1] as [number, number],
  venueFeatured: [16, 9] as [number, number],
};
