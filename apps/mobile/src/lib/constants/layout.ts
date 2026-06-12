export const MOBILE_BOTTOM_TAB_BAR_HEIGHT = 48;
export const MOBILE_ANDROID_KEYBOARD_VERTICAL_OFFSET = 80;
export const MOBILE_IOS_KEYBOARD_VERTICAL_OFFSET = 80;
export const TABLET_BREAKPOINT = 768;
export const LARGE_TABLET_BREAKPOINT = 1024;
export const MOBILE_CONTENT_HORIZONTAL_PADDING = 20;
export const TABLET_CONTENT_HORIZONTAL_PADDING = 24;
export const LARGE_TABLET_CONTENT_HORIZONTAL_PADDING = 32;
export const TABLET_CONTENT_MAX_WIDTH = 680;
export const LARGE_TABLET_CONTENT_MAX_WIDTH = 760;

// TODO: Tune this per platform/form-factor once we finish the keyboard avoidance pass.
// Android currently needs a positive offset so KeyboardStickyView clears the keyboard
// without leaving the composer too far above it; iOS may need a different value.
export const STICKY_COMPOSER_KEYBOARD_OFFSET = 70;

export function isTabletWidth(viewportWidth: number) {
  return viewportWidth >= TABLET_BREAKPOINT;
}

export function isLargeTabletWidth(viewportWidth: number) {
  return viewportWidth >= LARGE_TABLET_BREAKPOINT;
}

export function getResponsiveContentHorizontalPadding(viewportWidth: number) {
  if (isLargeTabletWidth(viewportWidth)) {
    return LARGE_TABLET_CONTENT_HORIZONTAL_PADDING;
  }

  if (isTabletWidth(viewportWidth)) {
    return TABLET_CONTENT_HORIZONTAL_PADDING;
  }

  return MOBILE_CONTENT_HORIZONTAL_PADDING;
}

export function getResponsiveContentContainerWidth(viewportWidth: number) {
  if (isLargeTabletWidth(viewportWidth)) {
    return Math.min(viewportWidth, LARGE_TABLET_CONTENT_MAX_WIDTH);
  }

  if (isTabletWidth(viewportWidth)) {
    return Math.min(viewportWidth, TABLET_CONTENT_MAX_WIDTH);
  }

  return viewportWidth;
}

export function getResponsiveContentWidth(viewportWidth: number) {
  return Math.max(
    getResponsiveContentContainerWidth(viewportWidth) - getResponsiveContentHorizontalPadding(viewportWidth) * 2,
    0,
  );
}
