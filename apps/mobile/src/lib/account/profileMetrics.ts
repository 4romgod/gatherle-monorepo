import { Platform, type TextProps } from 'react-native';

const isAndroid = Platform.OS === 'android';

// Android renders this profile surface looser than iOS, so keep these dense widgets slightly more compact.
export const profileMetrics = {
  accountInterestTextSize: isAndroid ? 12 : 13,
  actionButtonGap: isAndroid ? 5 : 6,
  actionButtonIconSize: isAndroid ? 13 : 14,
  actionButtonLabelSize: isAndroid ? 12 : 13,
  actionButtonMinHeight: isAndroid ? 36 : 38,
  actionButtonPaddingHorizontal: isAndroid ? 10 : 12,
  badgeIconSize: isAndroid ? 12 : 13,
  badgeRadius: isAndroid ? 7 : 8,
  badgeSize: isAndroid ? 20 : 22,
  badgeWrapGap: isAndroid ? 5 : 6,
  followedCopyLineHeight: isAndroid ? 17 : 18,
  followedCopySize: isAndroid ? 12 : 13,
  headerGap: isAndroid ? 12 : 14,
  identityGap: isAndroid ? 6 : 8,
  interestPillPaddingHorizontal: isAndroid ? 11 : 12,
  interestPillPaddingVertical: isAndroid ? 7 : 8,
  interestsLabelSize: isAndroid ? 10 : 11,
  profileActionsRowGap: isAndroid ? 8 : 10,
  profileActionsRowMarginTop: isAndroid ? -10 : -12,
  profileBioLineHeight: isAndroid ? 19 : 21,
  profileBioSize: isAndroid ? 13 : 14,
  profileNameSize: isAndroid ? 17 : 18,
  profileStatsGap: isAndroid ? 6 : 8,
  profileTextBlockGap: isAndroid ? 3 : 4,
  profileTopHandleSize: isAndroid ? 15 : 16,
  profileTopRailGap: isAndroid ? 10 : 12,
  profileTopRailMinHeight: isAndroid ? 82 : 88,
  profileTopRowGap: isAndroid ? 14 : 16,
  publicInterestTextSize: isAndroid ? 11 : 12,
  statLabelSize: isAndroid ? 11 : 12,
  statMinHeight: isAndroid ? 50 : 54,
  statPaddingHorizontal: isAndroid ? 4 : 6,
  statPaddingVertical: isAndroid ? 3 : 4,
  statValueSize: isAndroid ? 19 : 21,
} as const;

export const profileTextProps: Pick<TextProps, 'maxFontSizeMultiplier'> = {};
export const profileCompactTextProps: Pick<TextProps, 'maxFontSizeMultiplier'> = isAndroid
  ? { maxFontSizeMultiplier: 1.15 }
  : {};
