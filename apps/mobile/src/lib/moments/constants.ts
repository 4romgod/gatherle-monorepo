export const MOMENT_BACKGROUND_SWATCHES = [
  { color: '#9333ea', token: 'bg-purple-600' },
  { color: '#2563eb', token: 'bg-blue-600' },
  { color: '#16a34a', token: 'bg-green-600' },
  { color: '#dc2626', token: 'bg-red-600' },
  { color: '#f97316', token: 'bg-orange-500' },
  { color: '#db2777', token: 'bg-pink-600' },
  { color: '#4f46e5', token: 'bg-indigo-600' },
  { color: '#0d9488', token: 'bg-teal-600' },
  { color: '#facc15', token: 'bg-yellow-400' },
  { color: '#06b6d4', token: 'bg-cyan-500' },
] as const;

export type MomentBackgroundToken = (typeof MOMENT_BACKGROUND_SWATCHES)[number]['token'];
export const MOMENT_DEFAULT_BACKGROUND = MOMENT_BACKGROUND_SWATCHES[0].token;
export const MOMENT_MAX_CAPTION_LENGTH = 280;
export const EVENT_MOMENT_POLLING_INTERVAL_MS = 10_000;
export const MOMENT_MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MOMENT_MAX_VIDEO_BYTES = 75 * 1024 * 1024;
export const MOMENT_MAX_VIDEO_DURATION_MS = 30_000;
export const MOMENT_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;
export const MOMENT_VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm'] as const;
