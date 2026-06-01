import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';
import { formatOccurrenceSessionTime, getEventTitle } from '@/lib/events/formatters';

type OccurrenceCalendarSnippetProps = {
  occurrence: MobileEventOccurrence;
  onPress?: () => void;
};

export function OccurrenceCalendarSnippet({ occurrence, onPress }: OccurrenceCalendarSnippetProps) {
  const { theme } = useAppTheme();
  const title = getEventTitle(occurrence);
  const timeLabel = formatOccurrenceSessionTime(occurrence.startAt, occurrence.timezone);

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.snippet,
        {
          backgroundColor: theme.colors.primarySoft,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.74 : 1,
        },
      ]}
    >
      <Text style={[styles.timeLabel, { color: theme.colors.primary }]} numberOfLines={1}>
        {timeLabel}
      </Text>
      <View style={styles.titleWrap}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]} numberOfLines={2}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  snippet: {
    borderRadius: MOBILE_RADIUS.compact,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  timeLabel: {
    ...typography.bodyBold,
    fontSize: fontSize.sm,
  },
  title: {
    ...typography.bodyBold,
    fontSize: fontSize.base,
    lineHeight: 18,
  },
  titleWrap: {
    minWidth: 0,
  },
});
