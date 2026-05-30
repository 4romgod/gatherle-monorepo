import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MobileEventOccurrence } from '@data/graphql/query/Discovery/types';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';
import { formatOccurrenceSessionDate, formatOccurrenceSessionTime } from '@/lib/events/formatters';

type EventSessionsRailProps = {
  occurrences: MobileEventOccurrence[];
  onSelectOccurrence: (occurrence: MobileEventOccurrence) => void;
  selectedOccurrenceId?: string | null;
};

export function EventSessionsRail({ occurrences, onSelectOccurrence, selectedOccurrenceId }: EventSessionsRailProps) {
  const { theme } = useAppTheme();

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
    >
      {occurrences.map((occurrence) => {
        const isSelected = occurrence.occurrenceId === selectedOccurrenceId;

        return (
          <Pressable
            accessibilityRole="button"
            key={occurrence.occurrenceId}
            onPress={() => onSelectOccurrence(occurrence)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceMuted,
                borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={styles.cardTextWrap}>
              <Text
                style={[
                  styles.dayText,
                  { color: isSelected ? theme.colors.primaryContrast : theme.colors.textPrimary },
                ]}
              >
                {formatOccurrenceSessionDate(occurrence.startAt, occurrence.timezone)}
              </Text>
              <Text
                style={[
                  styles.timeText,
                  { color: isSelected ? theme.colors.primaryContrast : theme.colors.textSecondary },
                ]}
              >
                {formatOccurrenceSessionTime(occurrence.startAt, occurrence.timezone)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: MOBILE_RADIUS.control,
    borderWidth: 1.5,
    minWidth: 154,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardTextWrap: {
    gap: 4,
  },
  content: {
    gap: 10,
    paddingRight: 20,
  },
  dayText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  scroll: {
    marginHorizontal: -2,
  },
  timeText: {
    ...typography.bodyMedium,
    fontSize: 13,
  },
});
