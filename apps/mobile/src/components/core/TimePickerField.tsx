import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { fontSize, typography } from '@/app/theme/typography';

type TimePickerFieldProps = {
  allowClear?: boolean;
  error?: string;
  helperText?: string;
  label: string;
  onChangeTime: (value: string) => void;
  placeholder?: string;
  value: string;
};

function padTimePart(value: number) {
  return String(value).padStart(2, '0');
}

function formatTimeValue(date: Date) {
  return `${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}`;
}

function parseTimeValue(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function formatDisplayTime(value: string) {
  const parsed = parseTimeValue(value);
  if (!parsed) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
}

function getInitialTime(value: string) {
  const parsed = parseTimeValue(value);
  if (parsed) {
    return parsed;
  }

  const date = new Date();
  date.setSeconds(0, 0);
  return date;
}

export function TimePickerField({
  allowClear = false,
  error,
  helperText,
  label,
  onChangeTime,
  placeholder = 'Select time',
  value,
}: TimePickerFieldProps) {
  const { theme } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [draftTime, setDraftTime] = useState(() => getInitialTime(value));
  const pickerTime = useMemo(() => getInitialTime(value), [value]);
  const displayValue = value.trim() ? formatDisplayTime(value) : placeholder;

  const openPicker = () => {
    setDraftTime(pickerTime);
    setOpen(true);
  };

  const handleAndroidChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setOpen(false);
    if (event.type === 'neutralButtonPressed') {
      onChangeTime('');
      return;
    }

    if (selectedDate) {
      onChangeTime(formatTimeValue(selectedDate));
    }
  };

  const handleIosChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setDraftTime(selectedDate);
    }
  };

  const clearTime = () => {
    onChangeTime('');
    setOpen(false);
  };

  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.label, { color: theme.colors.textPrimary }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={openPicker}
        style={({ pressed }) => [
          styles.inputWrap,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error ? theme.colors.error : theme.colors.border,
            opacity: pressed ? 0.88 : 1,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.valueText, { color: value.trim() ? theme.colors.textPrimary : theme.colors.textMuted }]}
        >
          {displayValue}
        </Text>
        <Feather color={theme.colors.textMuted} name="clock" size={18} />
      </Pressable>
      {error ? <Text style={[styles.supportText, { color: theme.colors.error }]}>{error}</Text> : null}
      {!error && helperText ? (
        <Text style={[styles.supportText, { color: theme.colors.textSecondary }]}>{helperText}</Text>
      ) : null}

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          display="default"
          is24Hour
          mode="time"
          onChange={handleAndroidChange}
          negativeButton={{ label: 'Cancel', textColor: theme.colors.textSecondary }}
          neutralButton={allowClear ? { label: 'Clear', textColor: theme.colors.textSecondary } : undefined}
          positiveButton={{ label: 'Done', textColor: theme.colors.primary }}
          value={pickerTime}
        />
      ) : null}

      {Platform.OS !== 'android' ? (
        <Modal animationType="fade" onRequestClose={() => setOpen(false)} transparent visible={open}>
          <Pressable onPress={() => setOpen(false)} style={styles.backdrop}>
            <Pressable
              onPress={(event) => event.stopPropagation()}
              style={[styles.iosCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <View style={styles.iosHeader}>
                <Text style={[styles.iosTitle, { color: theme.colors.textPrimary }]}>{label}</Text>
                <Pressable
                  accessibilityLabel="Close time picker"
                  onPress={() => setOpen(false)}
                  style={styles.closeButton}
                >
                  <Feather color={theme.colors.textSecondary} name="x" size={20} />
                </Pressable>
              </View>

              <DateTimePicker
                accentColor={theme.colors.primary}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                is24Hour
                mode="time"
                onChange={handleIosChange}
                textColor={theme.colors.textPrimary}
                themeVariant={theme.mode}
                value={draftTime}
              />

              <View style={styles.footerRow}>
                {allowClear ? (
                  <Pressable onPress={clearTime} style={[styles.secondaryButton, { borderColor: theme.colors.border }]}>
                    <Text style={[styles.secondaryButtonText, { color: theme.colors.textPrimary }]}>Clear</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => {
                    onChangeTime(formatTimeValue(draftTime));
                    setOpen(false);
                  }}
                  style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                >
                  <Text style={[styles.primaryButtonText, { color: theme.colors.primaryContrast }]}>Done</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  closeButton: {
    padding: 4,
  },
  fieldBlock: {
    gap: 8,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  inputWrap: {
    alignItems: 'center',
    borderRadius: MOBILE_RADIUS.control,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iosCard: {
    borderRadius: MOBILE_RADIUS.panel,
    borderWidth: 1,
    gap: 16,
    maxWidth: 380,
    padding: 18,
    width: '100%',
  },
  iosHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  iosTitle: {
    ...typography.bodyBold,
    fontSize: fontSize.xl2,
  },
  label: {
    ...typography.bodySemiBold,
    fontSize: fontSize.base,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    ...typography.bodyBold,
    fontSize: fontSize.base,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    ...typography.bodyBold,
    fontSize: fontSize.base,
  },
  supportText: {
    ...typography.bodyMedium,
    fontSize: fontSize.md,
    lineHeight: 16,
  },
  valueText: {
    ...typography.bodyRegular,
    flex: 1,
    fontSize: 15,
  },
});
