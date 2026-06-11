import { Feather } from '@expo/vector-icons';
import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

type SelectionControlProps = {
  accessibilityLabel?: string;
  description?: string;
  kind: 'checkbox' | 'radio';
  label: string;
  onPress: () => void;
  selected: boolean;
  style?: StyleProp<ViewStyle>;
};

function RadioIndicator({ selected }: { selected: boolean }) {
  const { theme } = useAppTheme();

  return (
    <View
      style={[
        styles.radioOuter,
        {
          borderColor: selected ? theme.colors.primary : theme.colors.border,
        },
      ]}
    >
      {selected ? <View style={[styles.radioInner, { backgroundColor: theme.colors.primary }]} /> : null}
    </View>
  );
}

function CheckboxIndicator({ selected }: { selected: boolean }) {
  const { theme } = useAppTheme();

  return (
    <View
      style={[
        styles.checkbox,
        {
          backgroundColor: selected ? theme.colors.primary : 'transparent',
          borderColor: selected ? theme.colors.primary : theme.colors.border,
        },
      ]}
    >
      {selected ? <Feather color={theme.colors.primaryContrast} name="check" size={12} /> : null}
    </View>
  );
}

export function SelectionControl({
  accessibilityLabel,
  description,
  kind,
  label,
  onPress,
  selected,
  style,
}: PropsWithChildren<SelectionControlProps>) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole={kind}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.root,
        style,
        {
          backgroundColor: selected ? theme.colors.surfaceRaised : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.indicatorWrap}>
        {kind === 'radio' ? <RadioIndicator selected={selected} /> : <CheckboxIndicator selected={selected} />}
      </View>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: theme.colors.textPrimary }]}>{label}</Text>
        {description ? (
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{description}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  description: {
    ...typography.bodyRegular,
    fontSize: fontSize.md,
    lineHeight: 17,
  },
  indicatorWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 1,
  },
  label: {
    ...typography.bodySemiBold,
    fontSize: fontSize.lg,
    lineHeight: 19,
  },
  radioInner: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  radioOuter: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  root: {
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
