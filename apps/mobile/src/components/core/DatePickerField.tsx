import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { MOBILE_RADIUS } from '@/app/theme/radius';
import { fontSize, typography } from '@/app/theme/typography';

type DatePickerFieldProps = {
  allowClear?: boolean;
  error?: string;
  helperText?: string;
  label: string;
  maximumDate?: Date;
  minimumDate?: Date;
  onChangeDate: (value: string) => void;
  placeholder?: string;
  value: string;
};

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function normalizeDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateValue(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function parseDateValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }

  return normalizeDate(date);
}

function formatDisplayDate(value: string) {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function getInitialDate(value: string, minimumDate?: Date, maximumDate?: Date) {
  const parsed = parseDateValue(value);
  if (parsed) {
    return parsed;
  }

  const today = normalizeDate(new Date());
  if (minimumDate && today < normalizeDate(minimumDate)) {
    return normalizeDate(minimumDate);
  }
  if (maximumDate && today > normalizeDate(maximumDate)) {
    return normalizeDate(maximumDate);
  }

  return today;
}

export function DatePickerField({
  allowClear = false,
  error,
  helperText,
  label,
  maximumDate,
  minimumDate,
  onChangeDate,
  placeholder = 'Select date',
  value,
}: DatePickerFieldProps) {
  const { theme } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(() => getInitialDate(value, minimumDate, maximumDate));
  const pickerDate = useMemo(() => getInitialDate(value, minimumDate, maximumDate), [maximumDate, minimumDate, value]);
  const displayValue = value.trim() ? formatDisplayDate(value) : placeholder;

  const openPicker = () => {
    setDraftDate(pickerDate);
    setOpen(true);
  };

  const handleAndroidChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setOpen(false);
    if (event.type === 'neutralButtonPressed') {
      onChangeDate('');
      return;
    }

    if (selectedDate) {
      onChangeDate(formatDateValue(selectedDate));
    }
  };

  const handleIosChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setDraftDate(selectedDate);
    }
  };

  const clearDate = () => {
    onChangeDate('');
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
        <Feather color={theme.colors.textMuted} name="calendar" size={18} />
      </Pressable>
      {error ? <Text style={[styles.supportText, { color: theme.colors.error }]}>{error}</Text> : null}
      {!error && helperText ? (
        <Text style={[styles.supportText, { color: theme.colors.textSecondary }]}>{helperText}</Text>
      ) : null}

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          display="default"
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          mode="date"
          onChange={handleAndroidChange}
          negativeButton={{ label: 'Cancel', textColor: theme.colors.textSecondary }}
          neutralButton={allowClear ? { label: 'Clear', textColor: theme.colors.textSecondary } : undefined}
          positiveButton={{ label: 'Done', textColor: theme.colors.primary }}
          value={pickerDate}
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
                  accessibilityLabel="Close date picker"
                  onPress={() => setOpen(false)}
                  style={styles.closeButton}
                >
                  <Feather color={theme.colors.textSecondary} name="x" size={20} />
                </Pressable>
              </View>

              <DateTimePicker
                accentColor={theme.colors.primary}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                mode="date"
                onChange={handleIosChange}
                textColor={theme.colors.textPrimary}
                themeVariant={theme.mode}
                value={draftDate}
              />

              <View style={styles.footerRow}>
                {allowClear ? (
                  <Pressable onPress={clearDate} style={[styles.secondaryButton, { borderColor: theme.colors.border }]}>
                    <Text style={[styles.secondaryButtonText, { color: theme.colors.textPrimary }]}>Clear</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => {
                    onChangeDate(formatDateValue(draftDate));
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
