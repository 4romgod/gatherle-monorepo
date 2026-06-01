import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';
import type { EventsCalendarViewMode } from '@/lib/events/occurrenceCalendar';

const VIEW_TABS: Array<{ label: string; value: EventsCalendarViewMode }> = [
  { label: 'List', value: 'list' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
];

type EventsViewTabsProps = {
  onChange: (value: EventsCalendarViewMode) => void;
  value: EventsCalendarViewMode;
};

export function EventsViewTabs({ onChange, value }: EventsViewTabsProps) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.tabRail, { borderBottomColor: theme.colors.border }]}>
      {VIEW_TABS.map((tab) => {
        const isActive = tab.value === value;

        return (
          <Pressable
            key={tab.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(tab.value)}
            style={({ pressed }) => [
              styles.tabButton,
              {
                backgroundColor: isActive ? theme.colors.primarySoft : 'transparent',
                borderBottomColor: isActive ? theme.colors.primary : 'transparent',
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isActive ? theme.colors.primary : theme.colors.textSecondary,
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    alignItems: 'center',
    borderBottomWidth: 2,
    borderRadius: MOBILE_RADIUS.compact,
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  tabLabel: {
    ...typography.bodySemiBold,
    fontSize: fontSize.xl,
  },
  tabRail: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
  },
});
