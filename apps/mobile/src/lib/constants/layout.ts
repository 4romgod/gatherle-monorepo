export const MOBILE_BOTTOM_TAB_BAR_HEIGHT = 48;
export const MOBILE_ANDROID_KEYBOARD_VERTICAL_OFFSET = -28;

// TODO: Tune this per platform/form-factor once we finish the keyboard avoidance pass.
// Android currently needs a positive offset so KeyboardStickyView clears the keyboard
// without leaving the composer too far above it; iOS may need a different value.
export const STICKY_COMPOSER_KEYBOARD_OFFSET = 70;
