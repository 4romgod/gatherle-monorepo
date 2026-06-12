export const SUPPORT_REQUEST_LIMITS = {
  messageMaxLength: 1000,
  messageMinLength: 10,
  pagePathMaxLength: 512,
  screenshotMaxBytes: 15 * 1024 * 1024,
  searchMaxLength: 120,
  subjectMaxLength: 120,
  subjectMinLength: 3,
} as const;

export const SUPPORT_REQUEST_SCREENSHOT_MAX_MB = SUPPORT_REQUEST_LIMITS.screenshotMaxBytes / (1024 * 1024);
