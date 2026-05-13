export const fontFamily = {
  bodyRegular: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
  bodySemiBold: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',
  displayMedium: 'SpaceGrotesk_500Medium',
  displayBold: 'SpaceGrotesk_700Bold',
} as const;

export const fontSize = {
  xxs: 9,
  xs: 10,
  sm: 11,
  md: 12,
  base: 13,
  lg: 14,
  xl: 15,
  xl2: 17,
  xl3: 20,
  display: 32,
} as const;

export const typography = {
  bodyRegular: {
    fontFamily: fontFamily.bodyRegular,
  },
  bodyMedium: {
    fontFamily: fontFamily.bodyMedium,
  },
  bodySemiBold: {
    fontFamily: fontFamily.bodySemiBold,
  },
  bodyBold: {
    fontFamily: fontFamily.bodyBold,
  },
  displayMedium: {
    fontFamily: fontFamily.displayMedium,
  },
  displayBold: {
    fontFamily: fontFamily.displayBold,
  },
} as const;
