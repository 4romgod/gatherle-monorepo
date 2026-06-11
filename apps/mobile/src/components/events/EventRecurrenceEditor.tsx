import { StyleSheet, Text, View } from 'react-native';
import { type EventRecurrenceWeekday } from '@gatherle/commons/client/utils';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { typography } from '@/app/theme/typography';
import { AccountTextField } from '@/components/account/shared/AccountTextField';
import { DatePickerField } from '@/components/core/DatePickerField';
import { SelectionControl } from '@/components/core/SelectionControl';
import {
  ensureWeeklyRecurrenceDays,
  getRecurrenceIntervalHelperText,
  MOBILE_EVENT_RECURRENCE_FREQUENCY_LABELS,
  MOBILE_EVENT_RECURRENCE_FREQUENCY_OPTIONS,
  MOBILE_EVENT_RECURRENCE_WEEKDAY_LABELS,
  MOBILE_EVENT_RECURRENCE_WEEKDAY_OPTIONS,
  type MobileEventRecurrenceState,
} from '@/lib/events/eventMutationForm';

type EventRecurrenceEditorProps = {
  date: string;
  onChange: (value: MobileEventRecurrenceState) => void;
  value: MobileEventRecurrenceState;
};

function parseDateValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toggleWeekday(daysOfWeek: readonly EventRecurrenceWeekday[], weekday: EventRecurrenceWeekday) {
  return daysOfWeek.includes(weekday)
    ? daysOfWeek.filter((value) => value !== weekday)
    : [...daysOfWeek, weekday].sort(
        (left, right) =>
          MOBILE_EVENT_RECURRENCE_WEEKDAY_OPTIONS.indexOf(left) -
          MOBILE_EVENT_RECURRENCE_WEEKDAY_OPTIONS.indexOf(right),
      );
}

export function EventRecurrenceEditor({ date, onChange, value }: EventRecurrenceEditorProps) {
  const { theme } = useAppTheme();
  const minimumRepeatUntilDate = parseDateValue(date);
  const intervalHelperText = getRecurrenceIntervalHelperText(value.frequency, value.interval);

  return (
    <View style={styles.section}>
      <View style={styles.choiceBlock}>
        <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Repeats</Text>
        <View style={styles.stack}>
          <SelectionControl
            description="Use this for a single scheduled event."
            kind="radio"
            label="One-time"
            onPress={() =>
              onChange({
                ...value,
                kind: 'single',
              })
            }
            selected={value.kind === 'single'}
          />
          <SelectionControl
            description="Use this when the event should repeat on a schedule."
            kind="radio"
            label="Recurring"
            onPress={() =>
              onChange({
                ...value,
                daysOfWeek:
                  value.frequency === 'WEEKLY' ? ensureWeeklyRecurrenceDays(value.daysOfWeek, date) : value.daysOfWeek,
                kind: 'recurring',
              })
            }
            selected={value.kind === 'recurring'}
          />
        </View>
      </View>

      {value.kind === 'recurring' ? (
        <>
          <View style={styles.choiceBlock}>
            <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Frequency</Text>
            <View style={styles.stack}>
              {MOBILE_EVENT_RECURRENCE_FREQUENCY_OPTIONS.map((frequency) => (
                <SelectionControl
                  key={frequency}
                  kind="radio"
                  label={MOBILE_EVENT_RECURRENCE_FREQUENCY_LABELS[frequency]}
                  onPress={() =>
                    onChange({
                      ...value,
                      daysOfWeek:
                        frequency === 'WEEKLY' ? ensureWeeklyRecurrenceDays(value.daysOfWeek, date) : value.daysOfWeek,
                      frequency,
                    })
                  }
                  selected={value.frequency === frequency}
                />
              ))}
            </View>
          </View>

          <AccountTextField
            keyboardType="phone-pad"
            label="Interval"
            onChangeText={(interval) =>
              onChange({
                ...value,
                interval,
              })
            }
            placeholder="1"
            value={value.interval}
          />
          <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>{intervalHelperText}</Text>

          <DatePickerField
            allowClear
            helperText="Leave blank to keep the series open-ended."
            label="Repeat until"
            minimumDate={minimumRepeatUntilDate}
            onChangeDate={(repeatUntilDate) =>
              onChange({
                ...value,
                repeatUntilDate,
              })
            }
            placeholder="Optional end date"
            value={value.repeatUntilDate}
          />

          {value.frequency === 'WEEKLY' ? (
            <View style={styles.choiceBlock}>
              <Text style={[styles.choiceLabel, { color: theme.colors.textPrimary }]}>Days of the week</Text>
              <View style={styles.grid}>
                {MOBILE_EVENT_RECURRENCE_WEEKDAY_OPTIONS.map((weekday) => (
                  <SelectionControl
                    key={weekday}
                    kind="checkbox"
                    label={MOBILE_EVENT_RECURRENCE_WEEKDAY_LABELS[weekday]}
                    onPress={() =>
                      onChange({
                        ...value,
                        daysOfWeek: toggleWeekday(value.daysOfWeek, weekday),
                      })
                    }
                    selected={value.daysOfWeek.includes(weekday)}
                    style={styles.gridItem}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  choiceBlock: {
    gap: 10,
  },
  choiceLabel: {
    ...typography.bodySemiBold,
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    flexBasis: '31%',
    flexGrow: 1,
  },
  helperText: {
    ...typography.bodyRegular,
    fontSize: 12,
    lineHeight: 18,
  },
  section: {
    gap: 14,
  },
  stack: {
    gap: 8,
  },
});
