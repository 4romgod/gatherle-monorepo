import type { GestureResponderEvent } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { typography } from '@/shared/theme/typography';

type FilterChipProps = {
  active?: boolean;
  label: string;
  onPress: () => void;
  onRemove?: () => void;
  small?: boolean;
  tone?: 'primary' | 'success';
};

export function FilterChip({ active, label, onPress, onRemove, small, tone = 'primary' }: FilterChipProps) {
  const { theme } = useAppTheme();
  const accent = tone === 'success' ? theme.colors.success : theme.colors.primary;
  const soft = tone === 'success' ? theme.colors.successSoft : theme.colors.primarySoft;
  const handleRemove = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onRemove?.();
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        small && styles.filterChipSmall,
        {
          backgroundColor: active ? soft : theme.colors.surfaceMuted,
          borderColor: active ? accent : 'transparent',
          opacity: pressed ? 0.86 : 1,
        },
      ]}
    >
      {onRemove ? (
        <View style={styles.filterChipRow}>
          <Text
            style={[
              styles.filterChipText,
              small && styles.filterChipTextSmall,
              { color: active ? accent : theme.colors.textPrimary },
            ]}
          >
            {label}
          </Text>
          <Pressable hitSlop={6} onPress={handleRemove}>
            <Feather color={accent} name="x" size={small ? 9 : 12} />
          </Pressable>
        </View>
      ) : (
        <Text
          style={[
            styles.filterChipText,
            small && styles.filterChipTextSmall,
            { color: active ? accent : theme.colors.textPrimary },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filterChip: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 14,
  },
  filterChipRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  filterChipSmall: {
    minHeight: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  filterChipText: {
    ...typography.bodySemiBold,
    fontSize: 15,
  },
  filterChipTextSmall: {
    ...typography.bodyRegular,
    fontSize: 11,
  },
});
