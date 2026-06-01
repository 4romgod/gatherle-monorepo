import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';
import { buildOccurrenceCalendarLabel, type EventsCalendarViewMode } from '@/lib/events/occurrenceCalendar';

type EventsCalendarNavigatorProps = {
  anchorDate: Date;
  onNext: () => void;
  onPrevious: () => void;
  onToday: () => void;
  viewMode: Exclude<EventsCalendarViewMode, 'list'>;
};

function NavigationIconButton({
  accessibilityLabel,
  icon,
  minimal = false,
  onPress,
}: {
  accessibilityLabel: string;
  icon: 'chevron-left' | 'chevron-right';
  minimal?: boolean;
  onPress: () => void;
}) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: minimal ? 'transparent' : theme.colors.surface,
          borderColor: minimal ? 'transparent' : theme.colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Feather color={theme.colors.textPrimary} name={icon} size={minimal ? 22 : 18} />
    </Pressable>
  );
}

export function EventsCalendarNavigator({
  anchorDate,
  onNext,
  onPrevious,
  onToday,
  viewMode,
}: EventsCalendarNavigatorProps) {
  const { theme } = useAppTheme();
  const viewLabel = viewMode === 'week' ? 'Week view' : 'Month view';
  const dateLabel = buildOccurrenceCalendarLabel(viewMode, anchorDate);
  const monthChromeLabel = anchorDate.toLocaleString('en-US', { month: 'short' }).replace('.', '').toUpperCase();
  const monthChromeYear = anchorDate.getFullYear();
  const todayDate = new Date().getDate();

  if (viewMode === 'month') {
    return (
      <View style={[styles.monthNavigator, { backgroundColor: theme.dark ? '#050607' : '#0a0d12' }]}>
        <View style={styles.monthHeaderRow}>
          <View style={styles.monthControls}>
            <NavigationIconButton
              accessibilityLabel="Show previous month"
              icon="chevron-left"
              minimal
              onPress={onPrevious}
            />
            <NavigationIconButton accessibilityLabel="Show next month" icon="chevron-right" minimal onPress={onNext} />
          </View>

          <View style={styles.monthTitleBlock}>
            <Text style={styles.monthTitle}>{monthChromeLabel}</Text>
            <Text style={[styles.monthYear, { color: 'rgba(255,255,255,0.56)' }]}>{monthChromeYear}</Text>
          </View>

          <Pressable
            accessibilityLabel="Jump to today"
            onPress={onToday}
            style={({ pressed }) => [
              styles.monthTodayButton,
              {
                borderColor: 'rgba(255,255,255,0.72)',
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={styles.monthTodayValue}>{todayDate}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.navigator}>
      <View style={styles.leading}>
        <View style={styles.controls}>
          <NavigationIconButton
            accessibilityLabel={`Show previous ${viewMode}`}
            icon="chevron-left"
            onPress={onPrevious}
          />
          <NavigationIconButton accessibilityLabel={`Show next ${viewMode}`} icon="chevron-right" onPress={onNext} />
        </View>

        <View style={styles.labelBlock}>
          <Text style={[styles.overline, { color: theme.colors.textMuted }]}>{viewLabel}</Text>
          <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>{dateLabel}</Text>
        </View>
      </View>

      <Pressable
        accessibilityLabel="Jump to today"
        onPress={onToday}
        style={({ pressed }) => [
          styles.todayButton,
          {
            backgroundColor: theme.colors.primarySoft,
            borderColor: theme.colors.primary,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Feather color={theme.colors.primary} name="calendar" size={15} />
        <Text style={[styles.todayLabel, { color: theme.colors.primary }]}>Today</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    flexDirection: 'row',
    gap: 8,
  },
  heading: {
    ...typography.bodyBold,
    fontSize: fontSize.xl3,
    letterSpacing: -0.4,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: MOBILE_RADIUS.control,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  labelBlock: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  leading: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  monthControls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  monthHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthNavigator: {
    borderRadius: 28,
    marginTop: 4,
    paddingBottom: 6,
    paddingHorizontal: 6,
    paddingTop: 6,
  },
  monthTitle: {
    ...typography.bodyBold,
    color: '#ffffff',
    fontSize: fontSize.display,
    letterSpacing: 2.2,
    lineHeight: fontSize.display + 2,
    textTransform: 'uppercase',
  },
  monthTitleBlock: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  monthTodayButton: {
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 2,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  monthTodayValue: {
    ...typography.bodyBold,
    color: '#ffffff',
    fontSize: fontSize.lg,
    lineHeight: fontSize.lg + 2,
  },
  monthYear: {
    ...typography.bodySemiBold,
    fontSize: fontSize.base,
    letterSpacing: 0.6,
  },
  navigator: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  overline: {
    ...typography.bodyBold,
    fontSize: fontSize.md,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  todayButton: {
    alignItems: 'center',
    borderRadius: MOBILE_RADIUS.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 38,
    paddingHorizontal: 14,
  },
  todayLabel: {
    ...typography.bodyBold,
    fontSize: fontSize.lg,
  },
});
